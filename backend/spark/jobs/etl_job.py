import re
from pyspark.sql import SparkSession
from pyspark.sql.functions import (
    col, length, avg, count, round, min, max, 
    countDistinct, udf, floor
)
from pyspark.sql.types import StructType, StructField, StringType, IntegerType, DoubleType
from typing import Dict

class AutoInsightsETL:
    """ETL optimizado para AutoInsights: Extract, Transform, Load"""
    
    # Constantes de validación
    PRICE_RANGE = (500, 1000000)
    YEAR_RANGE = (1990, 2025)
    ODOMETER_RANGE = (0, 500000)
    STATE_LENGTH = 2
    PRICE_BUCKET_SIZE = 2000
    MAX_PRICE_HISTOGRAM = 100000
    
    # Catálogo maestro
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
        "dodge": ["charger", "challenger", "durango", "journey", "grand caravan", "dart", "avenger", "ram"],
        "bmw": ["3 series", "5 series", "x3", "x5", "328i", "335i", "528i", "535i", "m3", "m5", "x1", "7 series"],
        "mercedes-benz": ["c-class", "e-class", "s-class", "glc", "gle", "cla", "g-class", "sprinter"],
        "hyundai": ["elantra", "sonata", "tucson", "santa fe", "accent", "veloster", "kona", "palisade"],
        "kia": ["optima", "sorento", "soul", "sportage", "forte", "rio", "stinger", "telluride"],
        "volkswagen": ["jetta", "passat", "tiguan", "golf", "beetle", "atlas", "cc"],
        "audi": ["a4", "a6", "q5", "q7", "a3", "a5", "q3", "tt"]
    }

    DIRECT_MAPPINGS = {
        "4 runner": "4runner", "4- runner": "4runner", "4-runner": "4runner",
        "f 150": "f-150", "f150": "f-150", "pkup": "pickup", 
        "super duty": "f-250", "p/u": "pickup"
    }

    # Compilar regex una sola vez
    JUNK_WORDS = [
        "owner", "clean", "title", "rust", "free", "new", "lift", "tires", "wheels", 
        "door", "4wd", "awd", "4x4", "auto", "manual", "cyl", "v6", "v8", "sedan", 
        "suv", "coupe", "convertible", "hatchback", "pickup", "truck", "van", "wagon",
        "edition", "sport", "limited", "lx", "ex", "se", "le", "xlt", "lariat"
    ]
    JUNK_PATTERN = re.compile(r'\b(' + '|'.join(JUNK_WORDS) + r')\b.*')
    ALPHANUMERIC_PATTERN = re.compile(r'[^a-z0-9\s-]')

    def __init__(self, input_path: str, mongo_uri: str):
        self.input_path = input_path
        self.mongo_uri = mongo_uri
        self.spark = None

    def create_spark_session(self):
        print("⚡ Iniciando Spark Session...")
        self.spark = SparkSession.builder \
            .appName("AutoInsights_ETL_Batch") \
            .config("spark.mongodb.input.uri", self.mongo_uri) \
            .config("spark.mongodb.output.uri", self.mongo_uri) \
            .config("spark.jars.packages", "org.mongodb.spark:mongo-spark-connector_2.12:3.0.1") \
            .getOrCreate()

    @staticmethod
    def define_schema() -> StructType:
        """Define el esquema del CSV una sola vez"""
        fields = [
            ("id", StringType()), ("url", StringType()), ("region", StringType()),
            ("region_url", StringType()), ("price", IntegerType()), ("year", IntegerType()),
            ("manufacturer", StringType()), ("model", StringType()), ("condition", StringType()),
            ("cylinders", StringType()), ("fuel", StringType()), ("odometer", DoubleType()),
            ("title_status", StringType()), ("transmission", StringType()), ("vin", StringType()),
            ("drive", StringType()), ("size", StringType()), ("type", StringType()),
            ("paint_color", StringType()), ("image_url", StringType()), ("description", StringType()),
            ("county", StringType()), ("state", StringType()), ("lat", DoubleType()),
            ("long", DoubleType()), ("posting_date", StringType())
        ]
        return StructType([StructField(name, dtype, True) for name, dtype in fields])

    def extract(self):
        """Lee CSV con esquema predefinido"""
        print("📥 Leyendo dataset desde CSV...")
        df = self.spark.read.csv(
            self.input_path, 
            header=True, 
            schema=self.define_schema(), 
            multiLine=True, # Clave para corregir saltos de línea en descripciones
            escape="\"",
            quote="\""
        )
        print(f"   --> Registros cargados: {df.count()}")
        return df

    @classmethod
    def clean_model_logic(cls, manufacturer: str, raw_model: str) -> str:
        """Lógica de limpieza optimizada"""
        if not raw_model:
            return "unknown"
        
        manu = (str(manufacturer).lower().strip()) if manufacturer else ""
        s = str(raw_model).lower().strip()

        # Correcciones directas
        for bad, good in cls.DIRECT_MAPPINGS.items():
            if bad in s:
                s = s.replace(bad, good)

        # Búsqueda en catálogo (ordenado por longitud)
        if manu in cls.KNOWN_MODELS:
            for valid_model in sorted(cls.KNOWN_MODELS[manu], key=len, reverse=True):
                if valid_model in s:
                    return valid_model

        # Fallback: limpieza agresiva
        s = s.replace(manu, "").strip()
        s = cls.JUNK_PATTERN.sub('', s)
        s = cls.ALPHANUMERIC_PATTERN.sub('', s).strip()
        
        tokens = s.split()
        return " ".join(tokens[:2]) if tokens else "other"

    def _add_validations(self, df):
        """Centraliza validaciones comunes"""
        return df.filter(
            (col("price") > self.PRICE_RANGE[0]) & 
            (col("price") < self.PRICE_RANGE[1]) & 
            (col("year") > self.YEAR_RANGE[0]) & 
            (col("year") <= self.YEAR_RANGE[1]) &
            col("manufacturer").isNotNull() &
            col("model").isNotNull()
        )

    def _check_data_quality(self, df):
        """Diagnóstico de calidad de datos"""
        print("🔍 Autopsia de datos...")
        df_dirty = df.filter(length(col("state")) > self.STATE_LENGTH)
        count_dirty = df_dirty.count()
        print(f"⚠️ Filas con 'state' corrupto: {count_dirty}")
        if count_dirty > 0:
            df_dirty.select("id", "state", "price").show(5, truncate=False)

    def transform(self, df):
        """
        Transforma datos en una sola pasada.
        Retorna dict con todos los dataframes calculados.
        """
        self._check_data_quality(df)
        print("🔄 Transformando y limpiando datos...")

        # Registrar UDF una sola vez
        clean_udf = udf(self.clean_model_logic, StringType())
        
        # Aplicar validaciones y limpiar modelos
        df_clean = self._add_validations(df).withColumn(
            "model", clean_udf(col("manufacturer"), col("model"))
        ).filter(
            (col("model") != "") & (col("model") != "unknown")
        )

        # Cache para reutilización (CRÍTICO)
        df_clean.cache()
        total_records = df_clean.count()
        print(f"   --> Datos limpios en caché: {total_records} registros")

        # Diccionario con todas las transformaciones
        results = {}

        # 1. Agregación por modelo y año (Base del análisis individual)
        print("📊 Calculando agregaciones...")
        results["precios_promedio"] = df_clean.groupBy("manufacturer", "model", "year").agg(
            round(avg("price"), 2).alias("avg_price"),
            count("*").alias("count")
        )

        # 2. KPI: Precio y Volumen por Año
        results["kpi_price_volume"] = df_clean.groupBy("year").agg(
            round(avg("price"), 2).alias("avg_price_year"),
            count("*").alias("volume_year")
        ).orderBy("year")

        # 3. Datos de Kilometraje (Scatter plot)
        results["kilometraje"] = df_clean.filter(
            (col("odometer").isNotNull()) & 
            (col("odometer") > self.ODOMETER_RANGE[0]) & 
            (col("odometer") < self.ODOMETER_RANGE[1])
        ).select("manufacturer", "model", "odometer", "price")

        # 4. Estadísticas Globales
        results["estadisticas_mercado"] = df_clean.agg(
            count("*").alias("total_vehicles"),
            countDistinct("manufacturer").alias("total_brands"),
            countDistinct("model").alias("total_models"),
            round(avg("price"), 2).alias("avg_market_price"),
            max("price").alias("most_expensive"),
            min("price").alias("cheapest"),
            min("year").alias("oldest_year"),
            max("year").alias("newest_year")
        )

        # 5. Distribución por Condición
        results["distribucion_condicion"] = df_clean \
            .fillna("unknown", subset=["condition"]) \
            .groupBy("condition") \
            .count() \
            .orderBy("count", ascending=False)

        # 6. Histograma de Precios
        results["histograma_precios"] = df_clean.select("price") \
            .withColumn("price_range", floor(col("price") / self.PRICE_BUCKET_SIZE) * self.PRICE_BUCKET_SIZE) \
            .groupBy("price_range") \
            .agg(count("*").alias("count")) \
            .orderBy("price_range") \
            .filter(col("price_range") < self.MAX_PRICE_HISTOGRAM)

        # 7. Distribución Geográfica (Mapa)
        results["distribucion_geo"] = df_clean \
            .filter(
                (col("state").isNotNull()) & 
                (length(col("state")) == self.STATE_LENGTH)
            ) \
            .groupBy("state") \
            .agg(
                count("*").alias("count"),
                round(avg("price"), 2).alias("avg_price")
            ) \
            .orderBy("count", ascending=False)

        # 8. Top 10 Marcas (NUEVO - BIG DATA PURA)
        # Calculamos el Top aquí para no cargar al backend
        print("🏆 Calculando Top 10 Marcas...")
        results["top_brands"] = df_clean.groupBy("manufacturer") \
            .agg(count("*").alias("count")) \
            .orderBy(col("count").desc()) \
            .limit(10)

        return results

    def load(self, df, collection_name: str, mode: str = "overwrite"):
        """Carga genérica a MongoDB"""
        print(f"💾 Guardando '{collection_name}'...")
        try:
            df.write.format("mongo") \
                .mode(mode) \
                .option("database", "autoinsights") \
                .option("collection", collection_name) \
                .save()
            print(f"✅ '{collection_name}' guardada")
        except Exception as e:
            print(f"❌ Error en '{collection_name}': {str(e)}")

    def load_all(self, results: Dict):
        """Carga todos los dataframes de una vez"""
        for collection_name, df in results.items():
            self.load(df, collection_name)

    def run(self):
        """Ejecuta el pipeline completo"""
        try:
            self.create_spark_session()
            df_raw = self.extract()
            results = self.transform(df_raw)
            self.load_all(results)
            print("🚀 ETL finalizado exitosamente")
        finally:
            if self.spark:
                self.spark.stop()

if __name__ == "__main__":
    # Rutas dentro del contenedor Docker
    INPUT_CSV = "/opt/spark/data/vehicles.csv"
    MONGO_URI = "mongodb://mongodb:27017/autoinsights"
    
    job = AutoInsightsETL(INPUT_CSV, MONGO_URI)
    job.run()