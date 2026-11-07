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
| medium | 11 | "Which ten Ford models have the most listings?" |
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
- extra columns are allowed when the expected columns are among them (an answer with context is
  still right); extra rows count as a mismatch.

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

Measured on 2026-11-07 against the real gold tables, temperature 0, one run per model, all on
free tiers. Reports with every question, its SQL and outcome are in
[`backend/evaluation/results/`](../backend/evaluation/results/).

| Provider | Model | Accuracy | Easy (14) | Medium (11) | Hard (5) | Wrong | Errors | Median latency |
|---|---|---|---|---|---|---|---|---|
| **Groq** | **openai/gpt-oss-20b** (default) | **96.7 %** (29/30) | 100 % | 100 % | 80 % | 0 | 1 SQL error | 0.6 s |
| Groq | openai/gpt-oss-120b | 90.0 % | 100 % | 91 % | 60 % | 0 | 3 SQL errors | 0.7 s |
| Groq | qwen/qwen3.8-27b | 76.7 % | 71 % | 73 % | 100 % | 0 | 7 rate-limited | 0.6 s |
| **Gemini** | **gemini-3.5-flash-lite** (fallback) | **80.0 %** | 93 % | 73 % | 60 % | 3 | 1 rejected, 2 unavailable | 2.1 s |
| Gemini | gemini-3.8-flash | — | | | | | 29 of 30 rate-limited or unavailable | |
| Offline | FakeProvider | 20 % (the 6 example questions) | | | | | | |

**Choice.** `openai/gpt-oss-20b` on Groq is the default: the most accurate, no wrong answers,
and the fastest of the stable models. `qwen/qwen3.8-27b` gave no wrong answer either, but its
free-tier token limit rejected 7 of 30 requests, too few for a public demo.
`gemini-3.5-flash-lite` is the fallback when Groq is saturated or down (tested live by forcing
a 429 on Groq); `gemini-3.8-flash` is not usable on the free tier.

Errors are not wrong answers: "SQL error" means DuckDB refused the model's query (for example
an aggregate mixed with a plain column), so the visitor sees a clear message instead of a wrong
figure. No model produced SQL that the guard had to block for safety; the one rejection was a
formatting slip (a stray `sql` line inside the code block), now tolerated by the parser (after
this run).

**Cost.** A question uses about 600 input tokens (the schema-only prompt) and 15-300 output
tokens (reasoning models think first). On the free tiers it costs $0; the API limits 6
questions per visitor per minute and 500 per day so the free quotas hold.

## What the first run taught

The first run scored 60-67 % on every Groq model, and the misses were mostly not the models:

1. **The scorer was too strict.** Answering "which state has the most listings" with the state
   and its count was marked wrong. Extra columns are now allowed when the expected ones are among
   them; extra rows are still a mismatch.
2. **The prompt left out facts the column list cannot show.** Models counted listings in
   `mileage_points` (only listings with a plausible odometer, about 98 %), took Subaru's share from
   `top_brands` (only 10 brands) and percentages from `price_histogram` (only prices under
   $100,000). One-line notes per table fixed it.
3. **Two questions were ambiguous** ("which states...", "which Ford models..." without a
   number, while the reference returned ten). They now say "ten".

These are corrections to the prompt and the test, not to the answers: the reference SQL did not
change, and the same 30 questions are used for every model.
