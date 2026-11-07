"""Execution-accuracy comparison: does the model's result equal the reference result?

Two results match when they have the same rows, where:
- column names and column order are ignored (a model may alias or reorder columns);
- row order matters only for questions marked `ordered` (rankings, time series);
- numbers match within 0.5 % (or 0.01 near zero), since models round differently;
- text is compared case-insensitively;
- extra columns are allowed when the expected columns are among them (a model that answers
  "which state" with the state AND its count is right), but extra rows are a mismatch.
"""

import math
from decimal import Decimal
from itertools import permutations
from typing import Any

REL_TOL = 0.005
ABS_TOL = 0.01


def _is_number(value: Any) -> bool:
    return isinstance(value, (int, float, Decimal)) and not isinstance(value, bool)


def _values_match(a: Any, b: Any) -> bool:
    if _is_number(a) and _is_number(b):
        return math.isclose(float(a), float(b), rel_tol=REL_TOL, abs_tol=ABS_TOL)
    if isinstance(a, str) and isinstance(b, str):
        return a.strip().lower() == b.strip().lower()
    return type(a) is type(b) and a == b


def _sort_key(value: Any) -> tuple[int, Any]:
    if value is None:
        return (0, "")
    if _is_number(value):
        return (1, float(value))
    return (2, str(value).strip().lower())


def _rows_match(expected: tuple, actual: tuple) -> bool:
    """Same values regardless of column order."""
    if len(expected) != len(actual):
        return False
    return all(
        _values_match(a, b)
        for a, b in zip(sorted(expected, key=_sort_key), sorted(actual, key=_sort_key), strict=True)
    )


def results_match(expected: list[tuple], actual: list[tuple], *, ordered: bool) -> bool:
    if len(expected) != len(actual):
        return False
    width = len(expected[0]) if expected else 0
    extra = len(actual[0]) - width if actual else 0
    if extra > 0:
        # try every choice of the actual columns that could carry the expected ones
        return any(
            _same_rows(expected, [tuple(row[i] for i in cols) for row in actual], ordered)
            for cols in permutations(range(len(actual[0])), width)
        )
    return _same_rows(expected, actual, ordered)


def _same_rows(expected: list[tuple], actual: list[tuple], ordered: bool) -> bool:
    if ordered:
        return all(_rows_match(e, a) for e, a in zip(expected, actual, strict=True))

    unmatched = list(actual)
    for row in expected:
        match = next(
            (i for i, candidate in enumerate(unmatched) if _rows_match(row, candidate)), None
        )
        if match is None:
            return False
        unmatched.pop(match)
    return True
