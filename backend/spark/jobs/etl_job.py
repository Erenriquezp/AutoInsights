"""AutoInsights batch ETL: read the listings CSV, clean it, write the gold tables as Parquet.

Run inside the Spark master container:
    /opt/spark/bin/spark-submit /app/etl_job.py

Configuration (environment variables, defaults match docker-compose.yml):
    ETL_INPUT_PATH   CSV to read                       /opt/spark/data/vehicles.csv
    ETL_OUTPUT_PATH  folder for the gold tables         /opt/spark/data/gold
    SPARK_MASTER     Spark master URL                   spark://spark-master:7077

Each gold table is written to <ETL_OUTPUT_PATH>/<table>/ as a single Parquet file. The folder is
shared with the API (backend/data/gold), which loads the tables into DuckDB.
"""

import os
from dataclasses import dataclass
from pathlib import Path

from pyspark.sql import DataFrame, SparkSession

import transforms

JOBS_DIR = Path(__file__).resolve().parent


@dataclass(frozen=True)
class EtlConfig:
    input_path: str
    output_path: str
    spark_master: str

    @classmethod
    def from_env(cls) -> "EtlConfig":
        return cls(
            input_path=os.getenv("ETL_INPUT_PATH", "/opt/spark/data/vehicles.csv"),
            output_path=os.getenv("ETL_OUTPUT_PATH", "/opt/spark/data/gold"),
            spark_master=os.getenv("SPARK_MASTER", "spark://spark-master:7077"),
        )


def create_spark_session(config: EtlConfig) -> SparkSession:
    spark = (
        SparkSession.builder.appName("AutoInsights_ETL_Batch")
        .master(config.spark_master)
        .config("spark.driver.host", "spark-master")
        .config("spark.driver.bindAddress", "0.0.0.0")
        .getOrCreate()
    )
    # Workers run the model-name UDF, so they need the helper modules too
    for module in ("normalize.py", "transforms.py"):
        spark.sparkContext.addPyFile(str(JOBS_DIR / module))
    return spark


def extract(spark: SparkSession, input_path: str) -> DataFrame:
    """Read the CSV with the explicit schema; descriptions contain line breaks."""
    return spark.read.csv(
        input_path,
        header=True,
        schema=transforms.SCHEMA,
        multiLine=True,
        escape='"',
        quote='"',
    )


def write_gold_table(df: DataFrame, output_path: str, table: str) -> None:
    """Overwrite one gold table as a single Parquet file. Errors propagate (non-zero exit)."""
    target = f"{output_path.rstrip('/')}/{table}"
    print(f"Writing '{table}' to {target}...")
    df.coalesce(1).write.mode("overwrite").parquet(target)


def run(config: EtlConfig) -> None:
    spark = create_spark_session(config)
    try:
        df_raw = extract(spark, config.input_path)
        print(f"Rows read: {df_raw.count()}")

        corrupt = transforms.corrupt_state_rows(df_raw)
        corrupt_count = corrupt.count()
        print(f"Rows with a corrupt 'state': {corrupt_count}")
        if corrupt_count:
            corrupt.select("id", "state", "price").show(5, truncate=False)

        df_clean = transforms.clean(df_raw).cache()
        print(f"Clean rows: {df_clean.count()}")

        for table, df in transforms.build_gold_tables(df_clean).items():
            write_gold_table(df, config.output_path, table)
        print("ETL finished")
    finally:
        spark.stop()


if __name__ == "__main__":
    run(EtlConfig.from_env())
