"""The SQL guard is the security boundary between LLM output and the database."""

import pytest

from ask.guard import MAX_ROWS, SqlRejected, extract_sql, validate_sql


def accepted(sql: str) -> str:
    return validate_sql(sql)


def rejection(sql: str) -> str:
    with pytest.raises(SqlRejected) as error:
        validate_sql(sql)
    return error.value.code


# ------------------------------------------------------------------ accepted queries


@pytest.mark.parametrize(
    "sql",
    [
        "SELECT * FROM market_stats",
        "select manufacturer, count from top_brands order by count desc",
        "SELECT state, avg_price FROM geo_distribution WHERE state = 'tx'",
        "SELECT year, avg_price_year FROM price_volume_by_year WHERE year BETWEEN 2010 AND 2020",
        "SELECT model, SUM(count) AS n FROM prices_by_model_year WHERE manufacturer = 'ford' "
        "GROUP BY model HAVING SUM(count) > 100 ORDER BY n DESC",
        "SELECT median(price), quantile_cont(price, 0.9) FROM mileage_points",
        "SELECT round(avg(odometer), 0) FROM mileage_points WHERE model = 'camry'",
        "WITH f AS (SELECT * FROM prices_by_model_year WHERE manufacturer = 'ford') "
        "SELECT model, max(avg_price) FROM f GROUP BY model",
        "SELECT manufacturer FROM top_brands UNION SELECT manufacturer FROM prices_by_model_year",
        "SELECT p.model, m.price FROM prices_by_model_year p "
        "JOIN mileage_points m ON p.model = m.model AND p.manufacturer = m.manufacturer",
        "SELECT CASE WHEN price > 20000 THEN 'high' ELSE 'low' END AS band, count(*) "
        "FROM mileage_points GROUP BY band",
        "SELECT * FROM (SELECT model, count FROM prices_by_model_year) sub",
        'SELECT "market_stats".total_vehicles FROM "market_stats"',
        "SELECT * FROM top_brands;",
    ],
)
def test_accepts_read_only_queries_on_gold_tables(sql):
    assert accepted(sql).upper().startswith(("SELECT", "WITH"))


def test_adds_a_limit_when_missing():
    assert accepted("SELECT * FROM mileage_points").endswith(f"LIMIT {MAX_ROWS}")


def test_caps_a_limit_above_the_maximum():
    assert accepted("SELECT * FROM mileage_points LIMIT 100000").endswith(f"LIMIT {MAX_ROWS}")


def test_keeps_a_smaller_limit():
    assert accepted("SELECT * FROM top_brands LIMIT 3").endswith("LIMIT 3")


def test_limits_a_union_as_a_whole():
    sql = accepted("SELECT manufacturer FROM top_brands UNION SELECT state FROM geo_distribution")

    assert sql.endswith(f"LIMIT {MAX_ROWS}")


def test_output_is_regenerated_from_the_parse_tree():
    # A string in FROM is a file path for DuckDB; the regenerated SQL makes it an identifier
    assert (
        accepted("SELECT * FROM 'market_stats'") == f'SELECT * FROM "market_stats" LIMIT {MAX_ROWS}'
    )


# ------------------------------------------------------------------ rejected queries


@pytest.mark.parametrize(
    ("sql", "code"),
    [
        ("", "empty"),
        ("   ", "empty"),
        ("-- just a comment", "empty"),
        ("SELECT * FROM (", "invalid_sql"),
        ("SELECT FROM WHERE", "invalid_sql"),
        ("SELEC * FRM market_stats", "not_a_select"),  # sqlglot parses this as an alias
        ("SELECT * FROM market_stats; DROP TABLE market_stats", "multiple_statements"),
        ("SELECT 1; SELECT 2", "multiple_statements"),
        ("DROP TABLE market_stats", "not_a_select"),
        ("DELETE FROM top_brands", "not_a_select"),
        ("UPDATE top_brands SET count = 0", "not_a_select"),
        ("INSERT INTO top_brands VALUES ('x', 1)", "not_a_select"),
        ("CREATE TABLE t AS SELECT * FROM top_brands", "not_a_select"),
        ("COPY market_stats TO '/tmp/out.csv'", "not_a_select"),
        ("ATTACH '/tmp/x.duckdb' AS x", "not_a_select"),
        ("INSTALL httpfs", "not_a_select"),
        ("LOAD httpfs", "not_a_select"),
        ("PRAGMA database_list", "not_a_select"),
        ("SET enable_external_access = true", "not_a_select"),
        ("SELECT * INTO copy_t FROM top_brands", "select_into"),
        ("SELECT * FROM users", "table_not_allowed"),
        ("SELECT * FROM 'vehicles.csv'", "table_not_allowed"),
        ("SELECT * FROM '/etc/passwd'", "table_not_allowed"),
        ("SELECT * FROM main.market_stats", "table_not_allowed"),
        ("SELECT * FROM other_db.main.market_stats", "table_not_allowed"),
        ("SELECT * FROM information_schema.tables", "table_not_allowed"),
        ("SELECT * FROM read_csv('/etc/passwd')", "table_function"),
        ("SELECT * FROM read_parquet('/tmp/x.parquet')", "table_function"),
        ("SELECT * FROM glob('*')", "table_function"),
        ("SELECT * FROM range(1000000000)", "table_function"),
        ("SELECT * FROM duckdb_settings()", "table_function"),
        ("SELECT read_text('/etc/passwd')", "function_not_allowed"),
        ("SELECT getenv('HOME')", "function_not_allowed"),
        ("SELECT read_csv('/etc/passwd')", "function_not_allowed"),
        ("SELECT current_setting('enable_external_access')", "function_not_allowed"),
        (
            "SELECT * FROM top_brands WHERE manufacturer = (SELECT read_blob('x'))",
            "function_not_allowed",
        ),
        ("SELECT * FROM top_brands WHERE count > ?", "parameter"),
        ("SELECT * FROM top_brands LIMIT (SELECT 5)", "invalid_limit"),
        ("SELECT * FROM top_brands LIMIT 'all'", "invalid_limit"),
    ],
)
def test_rejects(sql, code):
    assert rejection(sql) == code


def test_cte_names_are_allowed_only_inside_their_query():
    assert rejection("WITH t AS (SELECT * FROM users) SELECT * FROM t") == "table_not_allowed"


def test_rejection_message_is_safe_to_show():
    with pytest.raises(SqlRejected) as error:
        validate_sql("SELECT * FROM users")

    assert "users" in str(error.value)


# ------------------------------------------------------------------ extracting SQL from a reply


@pytest.mark.parametrize(
    ("reply", "expected"),
    [
        ("SELECT 1", "SELECT 1"),
        ("```sql\nSELECT * FROM top_brands\n```", "SELECT * FROM top_brands"),
        ("Here you go:\n```\nSELECT 1\n```\nHope it helps", "SELECT 1"),
        ("  \n SELECT 2 \n ", "SELECT 2"),
    ],
)
def test_extract_sql(reply, expected):
    assert extract_sql(reply) == expected
