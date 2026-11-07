"""AutoInsights batch ETL: read the listings CSV, clean it, write the aggregates to MongoDB.

Run inside the Spark master container:
    /opt/spark/bin/spark-submit /app/etl_job.py

Configuration (environment variables, defaults match docker-compose.yml):
    ETL_INPUT_PATH   CSV to read                    /opt/spark/data/vehicles.csv
    ETL_MONGO_URI    MongoDB URI with the database  mongodb://mongodb:27017/autoinsights
    SPARK_MASTER     Spark master URL               spark://spark-master:7077
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
    mongo_uri: str
    spark_master: str

    @classmethod
    def from_env(cls) -> "EtlConfig":
        return cls(
            input_path=os.getenv("ETL_INPUT_PATH", "/opt/spark/data/vehicles.csv"),
            mongo_uri=os.getenv("ETL_MONGO_URI", "mongodb://mongodb:27017/autoinsights"),
            spark_master=os.getenv("SPARK_MASTER", "spark://spark-master:7077"),
        )


def create_spark_session(config: EtlConfig) -> SparkSession:
    # The MongoDB connector is loaded through spark-defaults.conf (it must be set at launch).
    spark = (
        SparkSession.builder.appName("AutoInsights_ETL_Batch")
        .master(config.spark_master)
        .config("spark.driver.host", "spark-master")
        .config("spark.driver.bindAddress", "0.0.0.0")
        .config("spark.mongodb.output.uri", config.mongo_uri)
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


def load(df: DataFrame, collection: str) -> None:
    """Overwrite one MongoDB collection. Errors propagate so the job exits non-zero."""
    print(f"Saving '{collection}'...")
    df.write.format("mongo").mode("overwrite").option("collection", collection).save()
    print(f"Saved '{collection}'")


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

        for collection, df in transforms.build_aggregates(df_clean).items():
            load(df, collection)
        print("ETL finished")
    finally:
        spark.stop()


if __name__ == "__main__":
    run(EtlConfig.from_env())
