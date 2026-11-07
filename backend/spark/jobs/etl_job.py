import re

from pyspark.sql import SparkSession
from pyspark.sql.functions import (
    avg,
    col,
    count,
    countDistinct,
    floor,
    length,
    max,
    min,
    round,
    udf,
)
from pyspark.sql.types import DoubleType, IntegerType, StringType, StructField, StructType


class AutoInsightsETL:
    """AutoInsights batch ETL: extract the CSV, clean and normalize it, load aggregates."""

    # Validation ranges
    PRICE_RANGE = (500, 1000000)
    YEAR_RANGE = (1990, 2025)
    ODOMETER_RANGE = (0, 500000)
    STATE_LENGTH = 2
    PRICE_BUCKET_SIZE = 2000
    MAX_PRICE_HISTOGRAM = 100000

    # Model catalog per brand, used to normalize free-text model names
    # fmt: off
    KNOWN_MODELS = {
        "ford": [
            "f-150", "f150", "mustang", "explorer", "escape", "focus", "fusion",
            "ranger", "edge", "expedition", "taurus", "fiesta", "flex", "bronco",
            "f-250", "f250", "f-350", "transit", "econoline", "excursion"
        ],
        "chevrolet": [
            "silverado", "malibu", "equinox", "cruze", "impala", "tahoe", "suburban",
            "corvette", "camaro", "colorado", "traverse", "blazer", "trax", "aveo",
            "spark", "sonic", "bolt", "volt", "avalanche", "express"
        ],
        "toyota": [
            "camry", "corolla", "rav4", "tacoma", "tundra", "4runner", "highlander",
            "sienna", "prius", "avalon", "yaris", "sequoia", "venza", "c-hr", "supra",
            "land cruiser", "matrix", "celica", "echo", "fj cruiser"
        ],
        "honda": [
            "civic", "accord", "cr-v", "pilot", "odyssey", "fit", "hr-v", "ridgeline",
            "insight", "passport", "element", "crosstour", "prelude", "s2000"
        ],
        "nissan": [
            "altima", "sentra", "rogue", "maxima", "pathfinder", "murano", "verso",
            "frontier", "titan", "armada", "leaf", "juk", "kicks", "nv200", "quest",
            "350z", "370z", "gt-r"
        ],
        "jeep": [
            "wrangler", "grand cherokee", "cherokee", "compass", "renegade", "liberty",
            "patriot", "gladiator", "commander", "wagoneer"
        ],
        "ram": ["1500", "2500", "3500", "promaster", "dakota"],
        "gmc": ["sierra", "acadia", "terrain", "yukon", "canyon", "envoy", "savana"],
        "subaru": ["outback", "forester", "impreza", "legacy", "crosstrek", "wrx", "brz", "ascent"],
        "dodge": [
            "charger", "challenger", "durango", "journey", "grand caravan", "dart", "avenger", "ram"
        ],
        "bmw": [
            "3 series", "5 series", "x3", "x5", "328i", "335i", "528i", "535i", "m3", "m5", "x1",
            "7 series"
        ],
        "mercedes-benz": [
            "c-class", "e-class", "s-class", "glc", "gle", "cla", "g-class", "sprinter"
        ],
        "hyundai": [
            "elantra", "sonata", "tucson", "santa fe", "accent", "veloster", "kona", "palisade"
        ],
        "kia": ["optima", "sorento", "soul", "sportage", "forte", "rio", "stinger", "telluride"],
        "volkswagen": ["jetta", "passat", "tiguan", "golf", "beetle", "atlas", "cc"],
        "audi": ["a4", "a6", "q5", "q7", "a3", "a5", "q3", "tt"]
    }

    # fmt: on

    DIRECT_MAPPINGS = {
        "4 runner": "4runner",
        "4- runner": "4runner",
        "4-runner": "4runner",
        "f 150": "f-150",
        "f150": "f-150",
        "pkup": "pickup",
        "super duty": "f-250",
        "p/u": "pickup",
    }

    # Words that mark the end of the model name in a listing title (compiled once)
    JUNK_WORDS = [
        "owner",
        "clean",
        "title",
        "rust",
        "free",
        "new",
        "lift",
        "tires",
        "wheels",
        "door",
        "4wd",
        "awd",
        "4x4",
        "auto",
        "manual",
        "cyl",
        "v6",
        "v8",
        "sedan",
        "suv",
        "coupe",
        "convertible",
        "hatchback",
        "pickup",
        "truck",
        "van",
        "wagon",
        "edition",
        "sport",
        "limited",
        "lx",
        "ex",
        "se",
        "le",
        "xlt",
        "lariat",
    ]
    JUNK_PATTERN = re.compile(r"\b(" + "|".join(JUNK_WORDS) + r")\b.*")
    ALPHANUMERIC_PATTERN = re.compile(r"[^a-z0-9\s-]")

    def __init__(self, input_path: str, mongo_uri: str):
        self.input_path = input_path
        self.mongo_uri = mongo_uri
        self.spark = None

    def create_spark_session(self):
        print("Starting Spark session...")
        self.spark = (
            SparkSession.builder.appName("AutoInsights_ETL_Batch")
            .master("spark://spark-master:7077")
            .config("spark.driver.host", "spark-master")
            .config("spark.driver.bindAddress", "0.0.0.0")
            .config("spark.mongodb.input.uri", self.mongo_uri)
            .config("spark.mongodb.output.uri", self.mongo_uri)
            .config("spark.jars.packages", "org.mongodb.spark:mongo-spark-connector_2.12:3.0.1")
            .getOrCreate()
        )

    @staticmethod
    def define_schema() -> StructType:
        """Explicit schema for the 26 CSV columns."""
        fields = [
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
        return StructType([StructField(name, dtype, True) for name, dtype in fields])

    def extract(self):
        """Read the CSV with the explicit schema."""
        print("Reading dataset from CSV...")
        df = self.spark.read.csv(
            self.input_path,
            header=True,
            schema=self.define_schema(),
            multiLine=True,  # descriptions contain line breaks
            escape='"',
            quote='"',
        )
        print(f"   --> Rows loaded: {df.count()}")
        return df

    @classmethod
    def clean_model_logic(cls, manufacturer: str, raw_model: str) -> str:
        """Normalize a free-text model name to a catalog model or a short cleaned name."""
        if not raw_model:
            return "unknown"

        manu = (str(manufacturer).lower().strip()) if manufacturer else ""
        s = str(raw_model).lower().strip()

        # Direct spelling fixes
        for bad, good in cls.DIRECT_MAPPINGS.items():
            if bad in s:
                s = s.replace(bad, good)

        # Catalog lookup, longest names first so "grand cherokee" wins over "cherokee"
        if manu in cls.KNOWN_MODELS:
            for valid_model in sorted(cls.KNOWN_MODELS[manu], key=len, reverse=True):
                if valid_model in s:
                    return valid_model

        # Fallback: strip the brand, trim noise words and keep the first two tokens
        s = s.replace(manu, "").strip()
        s = cls.JUNK_PATTERN.sub("", s)
        s = cls.ALPHANUMERIC_PATTERN.sub("", s).strip()

        tokens = s.split()
        return " ".join(tokens[:2]) if tokens else "other"

    def _add_validations(self, df):
        """Keep rows with a plausible price and year and a brand and model."""
        return df.filter(
            (col("price") > self.PRICE_RANGE[0])
            & (col("price") < self.PRICE_RANGE[1])
            & (col("year") > self.YEAR_RANGE[0])
            & (col("year") <= self.YEAR_RANGE[1])
            & col("manufacturer").isNotNull()
            & col("model").isNotNull()
        )

    def _check_data_quality(self, df):
        """Report rows with a corrupt state column before they are filtered out."""
        print("Checking data quality...")
        df_dirty = df.filter(length(col("state")) > self.STATE_LENGTH)
        count_dirty = df_dirty.count()
        print(f"Rows with a corrupt 'state': {count_dirty}")
        if count_dirty > 0:
            df_dirty.select("id", "state", "price").show(5, truncate=False)

    def transform(self, df):
        """Clean the data once and compute every aggregate.

        Returns a dict of collection name -> DataFrame.
        """
        self._check_data_quality(df)
        print("Cleaning and transforming...")

        # Register the UDF once
        clean_udf = udf(self.clean_model_logic, StringType())

        # Apply validations and normalize model names
        df_clean = (
            self._add_validations(df)
            .withColumn("model", clean_udf(col("manufacturer"), col("model")))
            .filter((col("model") != "") & (col("model") != "unknown"))
        )

        # Cached: every aggregate below reuses the cleaned data
        df_clean.cache()
        total_records = df_clean.count()
        print(f"   --> Clean rows cached: {total_records}")

        # Diccionario con todas las transformaciones
        results = {}

        # 1. Average price and count per brand, model and year (per-model analysis)
        print("Computing aggregates...")
        results["precios_promedio"] = df_clean.groupBy("manufacturer", "model", "year").agg(
            round(avg("price"), 2).alias("avg_price"), count("*").alias("count")
        )

        # 2. Average price and volume per year
        results["kpi_price_volume"] = (
            df_clean.groupBy("year")
            .agg(round(avg("price"), 2).alias("avg_price_year"), count("*").alias("volume_year"))
            .orderBy("year")
        )

        # 3. Price vs. odometer points (scatter plot)
        results["kilometraje"] = df_clean.filter(
            (col("odometer").isNotNull())
            & (col("odometer") > self.ODOMETER_RANGE[0])
            & (col("odometer") < self.ODOMETER_RANGE[1])
        ).select("manufacturer", "model", "odometer", "price")

        # 4. Global market statistics
        results["estadisticas_mercado"] = df_clean.agg(
            count("*").alias("total_vehicles"),
            countDistinct("manufacturer").alias("total_brands"),
            countDistinct("model").alias("total_models"),
            round(avg("price"), 2).alias("avg_market_price"),
            max("price").alias("most_expensive"),
            min("price").alias("cheapest"),
            min("year").alias("oldest_year"),
            max("year").alias("newest_year"),
        )

        # 5. Listings by condition
        results["distribucion_condicion"] = (
            df_clean.fillna("unknown", subset=["condition"])
            .groupBy("condition")
            .count()
            .orderBy("count", ascending=False)
        )

        # 6. Price histogram
        results["histograma_precios"] = (
            df_clean.select("price")
            .withColumn(
                "price_range", floor(col("price") / self.PRICE_BUCKET_SIZE) * self.PRICE_BUCKET_SIZE
            )
            .groupBy("price_range")
            .agg(count("*").alias("count"))
            .orderBy("price_range")
            .filter(col("price_range") < self.MAX_PRICE_HISTOGRAM)
        )

        # 7. Listings and average price per state (map)
        results["distribucion_geo"] = (
            df_clean.filter(
                (col("state").isNotNull()) & (length(col("state")) == self.STATE_LENGTH)
            )
            .groupBy("state")
            .agg(count("*").alias("count"), round(avg("price"), 2).alias("avg_price"))
            .orderBy("count", ascending=False)
        )

        # 8. Top 10 brands by volume, computed here so the API only reads it
        print("Computing top 10 brands...")
        results["top_brands"] = (
            df_clean.groupBy("manufacturer")
            .agg(count("*").alias("count"))
            .orderBy(col("count").desc())
            .limit(10)
        )

        return results

    def load(self, df, collection_name: str, mode: str = "overwrite"):
        """Write one DataFrame to a MongoDB collection."""
        print(f"Saving '{collection_name}'...")
        try:
            df.write.format("mongo").mode(mode).option("database", "autoinsights").option(
                "collection", collection_name
            ).save()
            print(f"Saved '{collection_name}'")
        except Exception as e:
            # Re-raise so a failed load fails the job (non-zero exit) instead of reporting success
            print(f"Error saving '{collection_name}': {e}")
            raise

    def load_all(self, results: dict):
        """Write every aggregate."""
        for collection_name, df in results.items():
            self.load(df, collection_name)

    def run(self):
        """Run the full pipeline."""
        try:
            self.create_spark_session()
            df_raw = self.extract()
            results = self.transform(df_raw)
            self.load_all(results)
            print("ETL finished")
        finally:
            if self.spark:
                self.spark.stop()


if __name__ == "__main__":
    # Paths inside the Spark containers
    INPUT_CSV = "/opt/spark/data/vehicles.csv"
    MONGO_URI = "mongodb://mongodb:27017/autoinsights"

    job = AutoInsightsETL(INPUT_CSV, MONGO_URI)
    job.run()
