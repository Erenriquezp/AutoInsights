import pytest

from normalize import clean_model_name


@pytest.mark.parametrize(
    ("manufacturer", "raw", "expected"),
    [
        # catalog hits
        ("ford", "F-150 XLT SuperCrew", "f-150"),
        ("toyota", "camry le", "camry"),
        ("honda", "Civic EX Sedan", "civic"),
        # longest catalog name wins
        ("jeep", "grand cherokee laredo", "grand cherokee"),
        ("jeep", "cherokee sport", "cherokee"),
        # direct spelling fixes
        ("ford", "f150 supercrew", "f-150"),
        ("ford", "f 150", "f-150"),
        ("toyota", "4 runner sr5", "4runner"),
        ("toyota", "4-runner", "4runner"),
        # fallback: brand removed, cut at the first noise word, first two tokens
        ("tesla", "model 3 long range", "model 3"),
        ("mazda", "mazda cx-5 touring awd", "cx-5 touring"),
        ("acura", "tlx", "tlx"),
        ("lexus", "rx 350!!", "rx 350"),
        # nothing usable
        ("mazda", "clean title", "other"),
        ("ford", None, "unknown"),
        ("ford", "", "unknown"),
        (None, "outback", "outback"),
    ],
)
def test_existing_behavior(manufacturer, raw, expected):
    assert clean_model_name(manufacturer, raw) == expected


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("f-350 super duty lariat", "f-350"),
        ("f350 super duty", "f-350"),
        ("f-450 super duty drw", "f-450"),
        ("f550 xl chassis", "f-550"),
        ("f-450sd", "f-450"),
        ("super duty", "f-250"),  # no number given: keep the v1 assumption
        ("f-250 super duty", "f-250"),
    ],
)
def test_ford_super_duty_keeps_the_series_number(raw, expected):
    assert clean_model_name("ford", raw) == expected


@pytest.mark.parametrize(
    ("manufacturer", "raw", "expected"),
    [
        ("acura", "mdx sh-awd", "mdx"),
        ("acura", "rdx sh-awd technology", "rdx"),
        ("bmw", "x5 xdrive35i 4-door", "x5"),
    ],
)
def test_noise_word_inside_a_hyphenated_token_drops_the_whole_token(manufacturer, raw, expected):
    assert clean_model_name(manufacturer, raw) == expected


@pytest.mark.parametrize(
    ("manufacturer", "raw", "expected"),
    [
        ("mazda", "2014 mazda3 grand touring", "mazda3 grand"),
        ("acura", "2016 mdx", "mdx"),
        ("lincoln", "2016", "other"),
    ],
)
def test_leading_model_year_is_not_part_of_the_model(manufacturer, raw, expected):
    assert clean_model_name(manufacturer, raw) == expected


def test_result_never_starts_or_ends_with_a_hyphen():
    assert clean_model_name("mazda", "- 3 -") == "3"
