"""Pure DataFrame transformations of the ETL: no I/O, no session creation, easy to test."""

from pyspark.sql import DataFrame
from pyspark.sql import functions as F
from pyspark.sql.types import DoubleType, IntegerType, StringType, StructField, StructType

from normalize import clean_model_name

# Validation ranges (lower bounds exclusive; year upper bound inclusive)
PRICE_RANGE = (500, 1_000_000)
YEAR_RANGE = (1990, 2025)
ODOMETER_RANGE = (0, 500_000)
STATE_LENGTH = 2
PRICE_BUCKET_SIZE = 2_000
MAX_PRICE_HISTOGRAM = 100_000
TOP_BRANDS = 10

_COLUMNS = [
    ("id", StringType()),
    ("url", StringType()),
    ("region", StringType()),
    ("region_url", StringType()),
    ("price", IntegerType()),
    ("year", IntegerType()),
    ("manufacturer", StringType()),
    ("model", StringType()),
    ("condition", StringType()),
    ("cylinders", StringType()),
    ("fuel", StringType()),
    ("odometer", DoubleType()),
    ("title_status", StringType()),
    ("transmission", StringType()),
    ("vin", StringType()),
    ("drive", StringType()),
    ("size", StringType()),
    ("type", StringType()),
    ("paint_color", StringType()),
    ("image_url", StringType()),
    ("description", StringType()),
    ("county", StringType()),
    ("state", StringType()),
    ("lat", DoubleType()),
    ("long", DoubleType()),
    ("posting_date", StringType()),
]

SCHEMA = StructType([StructField(name, dtype, True) for name, dtype in _COLUMNS])

_clean_model_udf = F.udf(clean_model_name, StringType())


def corrupt_state_rows(df: DataFrame) -> DataFrame:
    """Rows whose `state` is longer than a 2-letter code (a sign of a broken CSV row)."""
    return df.filter(F.length("state") > STATE_LENGTH)


def validate(df: DataFrame) -> DataFrame:
    """Keep rows with a plausible price and model year, a brand and a model."""
    return df.filter(
        (F.col("price") > PRICE_RANGE[0])
        & (F.col("price") < PRICE_RANGE[1])
        & (F.col("year") > YEAR_RANGE[0])
        & (F.col("year") <= YEAR_RANGE[1])
        & F.col("manufacturer").isNotNull()
        & F.col("model").isNotNull()
    )


def clean(df: DataFrame) -> DataFrame:
    """Validated rows with normalized model names; rows without a usable model are dropped."""
    return (
        validate(df)
        .withColumn("model", _clean_model_udf(F.col("manufacturer"), F.col("model")))
        .filter((F.col("model") != "") & (F.col("model") != "unknown"))
    )


def prices_by_model_year(df: DataFrame) -> DataFrame:
    """Average price and listing count per brand, model and year (depreciation curves)."""
    return df.groupBy("manufacturer", "model", "year").agg(
        F.round(F.avg("price"), 2).alias("avg_price"), F.count("*").alias("count")
    )


def price_volume_by_year(df: DataFrame) -> DataFrame:
    """Average price and listing volume per model year."""
    return (
        df.groupBy("year")
        .agg(
            F.round(F.avg("price"), 2).alias("avg_price_year"),
            F.count("*").alias("volume_year"),
        )
        .orderBy("year")
    )


def mileage_points(df: DataFrame) -> DataFrame:
    """Price vs. odometer points with a plausible odometer reading."""
    return df.filter(
        F.col("odometer").isNotNull()
        & (F.col("odometer") > ODOMETER_RANGE[0])
        & (F.col("odometer") < ODOMETER_RANGE[1])
    ).select("manufacturer", "model", "odometer", "price")


def market_stats(df: DataFrame) -> DataFrame:
    """One row of global market statistics."""
    return df.agg(
        F.count("*").alias("total_vehicles"),
        F.countDistinct("manufacturer").alias("total_brands"),
        F.countDistinct("model").alias("total_models"),
        F.round(F.avg("price"), 2).alias("avg_market_price"),
        F.max("price").alias("most_expensive"),
        F.min("price").alias("cheapest"),
        F.min("year").alias("oldest_year"),
        F.max("year").alias("newest_year"),
    )


def condition_distribution(df: DataFrame) -> DataFrame:
    """Listings per reported condition; missing conditions count as "unknown"."""
    return (
        df.fillna("unknown", subset=["condition"])
        .groupBy("condition")
        .count()
        .orderBy("count", ascending=False)
    )


def price_histogram(df: DataFrame) -> DataFrame:
    """Listings per price bucket of PRICE_BUCKET_SIZE, below MAX_PRICE_HISTOGRAM."""
    return (
        df.select("price")
        .withColumn("price_range", F.floor(F.col("price") / PRICE_BUCKET_SIZE) * PRICE_BUCKET_SIZE)
        .groupBy("price_range")
        .agg(F.count("*").alias("count"))
        .filter(F.col("price_range") < MAX_PRICE_HISTOGRAM)
        .orderBy("price_range")
    )


def geo_distribution(df: DataFrame) -> DataFrame:
    """Listings and average price per US state (2-letter code)."""
    return (
        df.filter(F.col("state").isNotNull() & (F.length("state") == STATE_LENGTH))
        .groupBy("state")
        .agg(F.count("*").alias("count"), F.round(F.avg("price"), 2).alias("avg_price"))
        .orderBy("count", ascending=False)
    )


def top_brands(df: DataFrame, limit: int = TOP_BRANDS) -> DataFrame:
    """Brands with the most listings."""
    return (
        df.groupBy("manufacturer")
        .agg(F.count("*").alias("count"))
        .orderBy(F.col("count").desc(), F.col("manufacturer"))
        .limit(limit)
    )


def build_gold_tables(df_clean: DataFrame) -> dict[str, DataFrame]:
    """Every gold table the API serves, keyed by table name."""
    return {
        "prices_by_model_year": prices_by_model_year(df_clean),
        "price_volume_by_year": price_volume_by_year(df_clean),
        "mileage_points": mileage_points(df_clean),
        "market_stats": market_stats(df_clean),
        "condition_distribution": condition_distribution(df_clean),
        "price_histogram": price_histogram(df_clean),
        "geo_distribution": geo_distribution(df_clean),
        "top_brands": top_brands(df_clean),
    }
