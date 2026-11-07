# Security policy

## Supported versions

Only the latest release and the branch it is developed on receive fixes.

## Reporting a vulnerability

Please **do not open a public issue**. Report it privately through
[GitHub private vulnerability reporting](https://github.com/Erenriquezp/AutoInsights/security/advisories/new).

Include what you found, how to reproduce it and the impact you expect. You will get an answer
within 7 days. Once a fix is released, the report can be disclosed and credited if you wish.

## Scope

In scope: the API, the dashboard, the "Ask the data" text-to-SQL feature (including prompt
injection that escapes the SQL validator) and the infrastructure code in this repository.

Out of scope: denial of service through traffic volume, and findings in third-party services
(AWS, LLM providers) that are not caused by this project's configuration.
