"""SQL guard: the security boundary between LLM output and DuckDB.

Every SQL string produced by a language model is untrusted. It is accepted only if it is a
single read-only SELECT (or UNION of SELECTs) over the allow-listed gold tables, calling only
allow-listed functions, without parameters, and with a bounded LIMIT. The SQL that runs is
regenerated from the parse tree, never the original text.

This is one of two layers: the DuckDB connection also has file and network access disabled and
its configuration locked (see repository.py).
"""

import re

import sqlglot
from sqlglot import exp
from sqlglot.errors import ParseError

from repository import GOLD_TABLES

DIALECT = "duckdb"
MAX_ROWS = 100

ALLOWED_TABLES = frozenset(GOLD_TABLES)

# Functions sqlglot does not model as typed expressions arrive as exp.Anonymous. Only these
# (aggregates and scalar helpers with no side effects) are allowed; anything else, including
# read_text, read_blob, getenv, current_setting or duckdb_* functions, is rejected.
ALLOWED_ANONYMOUS_FUNCTIONS = frozenset(
    {
        "any_value",
        "approx_count_distinct",
        "arg_max",
        "arg_min",
        "bool_and",
        "bool_or",
        "list",
        "mode",
        "quantile",
        "quantile_disc",
        "round_even",
        "string_agg",
    }
)

# Typed function classes that touch files or the outside world. Typed classes cover ordinary
# SQL (COUNT, SUM, ROUND, CASE, CAST...), so they are allowed unless listed here.
FORBIDDEN_FUNCTION_CLASSES: tuple[type[exp.Expression], ...] = (exp.ReadCSV,)

# A fenced block, closed or not (a reply cut short still carries its SQL)
_CODE_FENCE = re.compile(r"```(?:sql)?\s*(.*?)(?:```|\Z)", re.IGNORECASE | re.DOTALL)


class SqlRejected(ValueError):
    """The SQL is not safe to run. `code` is stable for clients; the message is for humans."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


def extract_sql(reply: str) -> str:
    """The SQL inside a model reply: the first fenced block if there is one, else the text."""
    match = _CODE_FENCE.search(reply)
    text = (match.group(1) if match else reply).strip()
    # some models repeat the language name on its own line inside the block
    return re.sub(r"^sql\s*\n", "", text, flags=re.IGNORECASE).strip()


def validate_sql(sql: str) -> str:
    """Return a safe, LIMIT-bounded version of `sql`, or raise SqlRejected."""
    statements = _parse(sql)
    if len(statements) != 1:
        raise SqlRejected("multiple_statements", "Only one SQL statement is allowed.")

    query = statements[0]
    if not isinstance(query, (exp.Select, exp.SetOperation)):
        raise SqlRejected("not_a_select", "Only SELECT queries are allowed.")

    _check_no_select_into(query)
    _check_tables(query)
    _check_functions(query)
    _check_no_parameters(query)
    query = _bound_limit(query)
    return query.sql(dialect=DIALECT)


def _parse(sql: str) -> list[exp.Expression]:
    try:
        statements = [s for s in sqlglot.parse(sql, read=DIALECT) if s is not None]
    except ParseError as error:
        raise SqlRejected("invalid_sql", "The SQL could not be parsed.") from error
    if not statements:
        raise SqlRejected("empty", "No SQL was produced.")
    return statements


def _check_no_select_into(query: exp.Expression) -> None:
    if any(select.args.get("into") for select in query.find_all(exp.Select)):
        raise SqlRejected("select_into", "SELECT ... INTO is not allowed.")


def _check_tables(query: exp.Expression) -> None:
    cte_names = {cte.alias_or_name for cte in query.find_all(exp.CTE)}
    for table in query.find_all(exp.Table):
        if not isinstance(table.this, exp.Identifier):
            raise SqlRejected("table_function", "Table functions are not allowed.")
        if table.args.get("db") or table.args.get("catalog"):
            raise SqlRejected("table_not_allowed", f"Table '{table.sql()}' is not allowed.")
        if table.name not in ALLOWED_TABLES and table.name not in cte_names:
            raise SqlRejected("table_not_allowed", f"Table '{table.name}' is not allowed.")


def _check_functions(query: exp.Expression) -> None:
    for function in query.find_all(exp.Func):
        if isinstance(function, FORBIDDEN_FUNCTION_CLASSES):
            raise SqlRejected(
                "function_not_allowed", f"Function '{function.sql_name()}' is not allowed."
            )
        if (
            isinstance(function, exp.Anonymous)
            and function.name.lower() not in ALLOWED_ANONYMOUS_FUNCTIONS
        ):
            raise SqlRejected("function_not_allowed", f"Function '{function.name}' is not allowed.")


def _check_no_parameters(query: exp.Expression) -> None:
    if query.find(exp.Placeholder, exp.Parameter):
        raise SqlRejected("parameter", "Query parameters are not allowed.")


def _bound_limit(query: exp.Expression) -> exp.Expression:
    limit = query.args.get("limit")
    if limit is None:
        return query.limit(MAX_ROWS)

    value = limit.expression
    if not (isinstance(value, exp.Literal) and value.is_int):
        raise SqlRejected("invalid_limit", "LIMIT must be a whole number.")
    if int(value.this) > MAX_ROWS:
        limit.set("expression", exp.Literal.number(MAX_ROWS))
    return query
