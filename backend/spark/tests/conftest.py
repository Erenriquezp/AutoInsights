from pathlib import Path

import pytest
from pyspark.sql import SparkSession

JOBS_DIR = Path(__file__).resolve().parent.parent / "jobs"


@pytest.fixture(scope="session")
def spark() -> SparkSession:
    session = (
        SparkSession.builder.master("local[2]")
        .appName("autoinsights-etl-tests")
        .config("spark.sql.shuffle.partitions", "2")
        .config("spark.ui.enabled", "false")
        .config("spark.sql.session.timeZone", "UTC")
        .getOrCreate()
    )
    # Python workers run the model-name UDF: ship the modules the same way etl_job.py does
    for module in ("normalize.py", "transforms.py"):
        session.sparkContext.addPyFile(str(JOBS_DIR / module))
    yield session
    session.stop()
