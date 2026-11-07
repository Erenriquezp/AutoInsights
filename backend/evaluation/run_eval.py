"""Score a text-to-SQL provider on the evaluation set (execution accuracy).

    python -m evaluation.run_eval                      # offline FakeProvider
    python -m evaluation.run_eval --provider groq --delay 2 --report evaluation/results/groq.json

For every question the reference SQL and the provider's SQL both run on the gold tables, and the
results are compared (see compare.py). Each answer is one of:
    correct    same result as the reference
    wrong      valid SQL, different result
    rejected   the SQL guard refused the model's SQL
    error      the provider failed, or the query failed or timed out
"""

import argparse
import json
import sys
import time
from collections import Counter
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from pathlib import Path

from ask.guard import validate_sql
from ask.providers import SqlProvider, get_provider
from ask.service import AskError, AskService
from config import settings
from evaluation.compare import results_match
from evaluation.questions import Question, load_questions
from repository import GoldRepository


@dataclass
class Result:
    id: str
    level: str
    outcome: str
    detail: str = ""
    sql: str = ""
    latency_ms: float = 0.0


@dataclass
class Report:
    provider: str
    run_at: str
    total: int
    counts: dict[str, int]
    accuracy: float
    rejection_rate: float
    accuracy_by_level: dict[str, float]
    results: list[Result] = field(default_factory=list)


def evaluate(
    questions: list[Question],
    repository: GoldRepository,
    provider: SqlProvider,
    *,
    timeout_seconds: float = settings.ASK_TIMEOUT_SECONDS,
    delay_seconds: float = 0.0,
) -> Report:
    service = AskService(repository, provider, timeout_seconds)
    results = []
    for index, question in enumerate(questions):
        if index and delay_seconds:
            time.sleep(delay_seconds)  # stay under free-tier rate limits
        _, expected = repository.run_untrusted(validate_sql(question.sql), timeout_seconds)
        started = time.perf_counter()
        try:
            answer = service.ask(question.text)
        except AskError as error:
            outcome = "rejected" if error.code.startswith("rejected_") else "error"
            result = Result(question.id, question.level, outcome, detail=error.code)
        else:
            actual = [tuple(row) for row in answer.rows]
            correct = results_match(expected, actual, ordered=question.ordered)
            result = Result(
                question.id, question.level, "correct" if correct else "wrong", sql=answer.sql
            )
        result.latency_ms = round((time.perf_counter() - started) * 1000, 1)
        results.append(result)
    return _summarize(provider.name, results)


def _summarize(provider: str, results: list[Result]) -> Report:
    total = len(results)
    counts = Counter(r.outcome for r in results)
    by_level: dict[str, float] = {}
    for level in ("easy", "medium", "hard"):
        level_results = [r for r in results if r.level == level]
        if level_results:
            correct = sum(r.outcome == "correct" for r in level_results)
            by_level[level] = round(correct / len(level_results), 3)
    return Report(
        provider=provider,
        run_at=datetime.now(UTC).isoformat(timespec="seconds"),
        total=total,
        counts={k: counts.get(k, 0) for k in ("correct", "wrong", "rejected", "error")},
        accuracy=round(counts["correct"] / total, 3) if total else 0.0,
        rejection_rate=round(counts["rejected"] / total, 3) if total else 0.0,
        accuracy_by_level=by_level,
        results=results,
    )


def format_report(report: Report) -> str:
    lines = [f"{'id':28} {'level':7} {'outcome':9} detail"]
    lines += [f"{r.id:28} {r.level:7} {r.outcome:9} {r.detail}" for r in report.results]
    lines.append("")
    lines.append(
        f"provider={report.provider}  accuracy={report.accuracy:.1%}  "
        f"rejected={report.rejection_rate:.1%}  counts={report.counts}  "
        f"by_level={report.accuracy_by_level}"
    )
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--provider", default=settings.LLM_PROVIDER)
    parser.add_argument("--gold", type=Path, default=Path(settings.GOLD_PATH))
    parser.add_argument("--delay", type=float, default=0.0, help="seconds between questions")
    parser.add_argument("--report", type=Path, help="write the full report as JSON")
    parser.add_argument("--min-accuracy", type=float, help="exit 1 below this accuracy (0-1)")
    args = parser.parse_args(argv)

    repository = GoldRepository(args.gold)
    if not repository.loaded_tables:
        print(f"No gold tables under {args.gold}: run the ETL first.", file=sys.stderr)
        return 2

    report = evaluate(
        load_questions(), repository, get_provider(args.provider), delay_seconds=args.delay
    )
    print(format_report(report))
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(asdict(report), indent=2), encoding="utf-8")
        print(f"Report written to {args.report}")
    if args.min_accuracy is not None and report.accuracy < args.min_accuracy:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
