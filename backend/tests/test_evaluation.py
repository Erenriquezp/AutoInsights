"""The evaluation set and the result comparison used to score text-to-SQL answers."""

import json
from decimal import Decimal

import pytest

from ask.guard import validate_sql
from ask.providers import EXAMPLES, FakeProvider, ProviderError
from evaluation.compare import results_match
from evaluation.questions import Question, load_questions
from evaluation.run_eval import evaluate, format_report, main
from gold_fixtures import write_gold
from repository import GoldRepository

# ------------------------------------------------------------------ the question set


def test_there_are_thirty_questions_with_unique_ids():
    questions = load_questions()

    assert len(questions) == 30
    assert len({q.id for q in questions}) == 30
    assert {q.level for q in questions} == {"easy", "medium", "hard"}


@pytest.mark.parametrize("question", load_questions(), ids=lambda q: q.id)
def test_reference_sql_passes_the_guard(question):
    validate_sql(question.sql)


def test_the_example_questions_are_part_of_the_set():
    assert set(EXAMPLES) <= {q.text for q in load_questions()}


# ------------------------------------------------------------------ comparison


@pytest.mark.parametrize(
    ("expected", "actual", "ordered", "match"),
    [
        ([("ford", 10)], [("ford", 10)], False, True),
        ([("ford", 10)], [(10, "ford")], False, True),  # column order does not matter
        ([("a", 1), ("b", 2)], [("b", 2), ("a", 1)], False, True),
        ([("a", 1), ("b", 2)], [("b", 2), ("a", 1)], True, False),  # ranking order matters
        ([("a", 1), ("b", 2)], [("a", 1), ("b", 2)], True, True),
        ([(20_000.0,)], [(20_050.0,)], False, True),  # within 0.5 %
        ([(20_000.0,)], [(20_200.0,)], False, False),
        ([(0.0,)], [(0.004,)], False, True),  # absolute tolerance near zero
        ([(27.29,)], [(Decimal("27.3"),)], False, True),
        ([("Ford",)], [("ford",)], False, True),  # case-insensitive text
        ([("ford", 10)], [("ford", 10, 99)], False, False),  # extra column
        ([("ford", 10)], [("ford", 10), ("kia", 1)], False, False),  # extra row
        ([("ford", 10), ("ford", 10)], [("ford", 10)], False, False),  # duplicates count
        ([("ford", 10)], [("ford", "10")], False, False),  # number vs text
        ([(None,)], [(None,)], False, True),
        ([(None,)], [(0,)], False, False),
        ([], [], False, True),
    ],
)
def test_results_match(expected, actual, ordered, match):
    assert results_match(expected, actual, ordered=ordered) is match


def test_integers_and_floats_compare_as_numbers():
    assert results_match([(10,)], [(10.0,)], ordered=False)


def test_booleans_are_not_numbers():
    assert not results_match([(1,)], [(True,)], ordered=False)


# ------------------------------------------------------------------ the harness


TOP = Question(
    "top",
    "easy",
    True,
    "Which brands have the most listings?",
    "SELECT manufacturer, count FROM top_brands ORDER BY count DESC",
)
FORD = Question(
    "ford",
    "medium",
    False,
    "Ford count?",
    "SELECT count FROM top_brands WHERE manufacturer = 'ford'",
)
HARD = Question("hard", "hard", False, "Something hard", "SELECT count FROM top_brands LIMIT 1")


class AnswerBook:
    """Replies per question text: SQL, or an exception to raise."""

    name = "book"

    def __init__(self, replies):
        self.replies = replies

    def generate_sql(self, question, prompt):
        reply = self.replies[question]
        if isinstance(reply, Exception):
            raise reply
        return reply


@pytest.fixture(scope="module")
def gold_dir(tmp_path_factory):
    return write_gold(
        tmp_path_factory.mktemp("gold"),
        {
            "top_brands": [
                {"manufacturer": "ford", "count": 46},
                {"manufacturer": "kia", "count": 8},
            ]
        },
    )


def test_evaluate_classifies_every_outcome(gold_dir):
    provider = AnswerBook(
        {
            TOP.text: "SELECT manufacturer, count FROM top_brands ORDER BY count DESC",
            FORD.text: "SELECT count FROM top_brands WHERE manufacturer = 'kia'",
            HARD.text: "DROP TABLE top_brands",
        }
    )
    timeout = Question("down", "hard", False, "provider down", "SELECT 1 FROM top_brands")
    provider.replies[timeout.text] = ProviderError("rate limited")

    report = evaluate([TOP, FORD, HARD, timeout], GoldRepository(gold_dir), provider)

    assert [r.outcome for r in report.results] == ["correct", "wrong", "rejected", "error"]
    assert report.counts == {"correct": 1, "wrong": 1, "rejected": 1, "error": 1}
    assert report.accuracy == 0.25
    assert report.rejection_rate == 0.25
    assert report.accuracy_by_level == {"easy": 1.0, "medium": 0.0, "hard": 0.0}
    assert report.results[2].detail == "rejected_not_a_select"
    assert "accuracy=25.0%" in format_report(report)


def test_evaluate_with_delay_and_no_questions(gold_dir, monkeypatch):
    sleeps = []
    monkeypatch.setattr("evaluation.run_eval.time.sleep", sleeps.append)

    report = evaluate([TOP, TOP], GoldRepository(gold_dir), FakeProvider(), delay_seconds=1.5)
    empty = evaluate([], GoldRepository(gold_dir), FakeProvider())

    assert sleeps == [1.5]
    assert report.accuracy == 1.0
    assert (empty.accuracy, empty.rejection_rate, empty.accuracy_by_level) == (0.0, 0.0, {})


def test_main_without_gold_tables(tmp_path, capsys):
    assert main(["--gold", str(tmp_path)]) == 2
    assert "run the ETL first" in capsys.readouterr().err


def test_main_writes_a_report_and_enforces_min_accuracy(gold_dir, tmp_path, monkeypatch):
    monkeypatch.setattr("evaluation.run_eval.load_questions", lambda: [TOP, FORD])
    report_path = tmp_path / "out" / "report.json"

    ok = main(["--gold", str(gold_dir), "--provider", "fake", "--report", str(report_path)])
    below = main(["--gold", str(gold_dir), "--provider", "fake", "--min-accuracy", "0.9"])

    assert ok == 0
    assert below == 1  # the fake provider only knows TOP: 50 %
    assert json.loads(report_path.read_text())["counts"]["correct"] == 1
