# AutoInsights documentation

| Document | What it covers |
|---|---|
| [Architecture](architecture.md) | How v1 is built and the v2 target on AWS |
| [Data model](data-model.md) | Gold tables: columns, cleaning rules, how to regenerate |
| [ADRs](adr/) | Architecture decision records: context, decision, alternatives, consequences |

Coming with v2:

- `security.md`: threat model, OWASP Top 10 for web and LLM applications
- `deployment.md`: AWS bootstrap, Terraform, CI/CD, teardown and costs
- `evaluation.md`: the text-to-SQL eval set and measured accuracy

## Dataset

[Used Cars Dataset](https://www.kaggle.com/datasets/austinreese/craigslist-carstrucks-data) by
Austin Reese (Craigslist US vehicle listings), published on Kaggle under **CC0: Public Domain**.
The 1.4 GB CSV is not stored in this repository.
