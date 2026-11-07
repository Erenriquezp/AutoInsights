# Evaluating "Ask the data"

A text-to-SQL feature is only as good as its measured accuracy. AutoInsights scores each
language-model provider on a fixed set of 30 questions with hand-written reference SQL, and the
README quotes the measured numbers, never estimates.

## The question set

[`backend/evaluation/questions.toml`](../backend/evaluation/questions.toml) holds 30 questions
about the gold tables, from single lookups to multi-step questions:

| Level | Count | Example |
|---|---|---|
| easy | 14 | "How many listings are there in California?" |
| medium | 11 | "Which Ford models have the most listings?" |
| hard | 5 | "Among brands with at least 1,000 listings, which one has the highest average price?" |

Each question carries the SQL a careful analyst would write. The expected answer is the result
of that SQL on the current gold tables, so the set stays valid when the data is regenerated.
Tests check that there are 30 questions with unique ids, that every reference query passes the
SQL guard (so the set never needs anything the guard forbids), and that the example questions
shown in the UI are part of the set.

## Scoring: execution accuracy

The provider's SQL and the reference SQL both run on the gold tables, and their results are
compared (`backend/evaluation/compare.py`):

- column names and column order are ignored;
- row order matters only for questions marked `ordered` (rankings and time series);
- numbers match within 0.5 % (or 0.01 near zero), since models round differently;
- text is compared case-insensitively;
- extra rows or columns count as a mismatch.

Every answer ends in one of four outcomes:

| Outcome | Meaning |
|---|---|
| correct | same result as the reference |
| wrong | valid SQL that returns a different result |
| rejected | the SQL guard refused the model's SQL |
| error | the provider failed, or the query failed or timed out |

The report gives accuracy overall and per level, plus the rejection rate. A high rejection rate
with low "wrong" answers means the guard is doing its job; a high "wrong" rate means the prompt
or the model needs work.

## Running it

```bash
cd backend
python -m evaluation.run_eval                                  # offline FakeProvider
python -m evaluation.run_eval --provider groq --delay 2 \
    --report evaluation/results/groq.json                      # a hosted free-tier model
```

`--delay` spaces requests to stay under free-tier rate limits. `--min-accuracy 0.8` makes the
command exit with an error below 80 %, for use as a quality gate.

## Results

| Provider | Model | Accuracy | Easy | Medium | Hard | Rejected | Date |
|---|---|---|---|---|---|---|---|
| FakeProvider (offline) | — | 20 % (the 6 example questions) | 29 % | 18 % | 0 % | 0 % | 2026-11-07 |
| Groq | to be chosen | pending | | | | | |
| Gemini | to be chosen | pending | | | | | |

The offline provider only knows the six example questions, so its score checks the harness, not
a model. Hosted providers are measured when they are connected.
