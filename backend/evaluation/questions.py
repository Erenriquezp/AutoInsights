import tomllib
from dataclasses import dataclass
from pathlib import Path

QUESTIONS_FILE = Path(__file__).with_name("questions.toml")


@dataclass(frozen=True)
class Question:
    id: str
    level: str
    ordered: bool
    text: str
    sql: str


def load_questions(path: Path = QUESTIONS_FILE) -> list[Question]:
    with path.open("rb") as file:
        data = tomllib.load(file)
    return [Question(**{**item, "sql": item["sql"].strip()}) for item in data["question"]]
