import sys
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, length, avg, count, round, sum, lit, min, max, countDistinct, udf, col, lower, trim, struct, floor
from pyspark.sql.types import StructType, StructField, StringType, IntegerType, DoubleType
import re

class AutoInsightsETL:
    """
    Clase encargada del proceso ETL (Extract, Transform, Load).
    Calcula KPIs granulares y estadísticas globales del mercado.
    """

    def __init__(self, input_path, mongo_uri):
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

    def define_schema(self):
        # Esquema manual para optimizar lectura
        return StructType([
            StructField("id", StringType(), True),
            StructField("url", StringType(), True),
            StructField("region", StringType(), True),
            StructField("region_url", StringType(), True),
            StructField("price", IntegerType(), True),
            StructField("year", IntegerType(), True),
            StructField("manufacturer", StringType(), True),
            StructField("model", StringType(), True),
            StructField("condition", StringType(), True),
            StructField("cylinders", StringType(), True),
            StructField("fuel", StringType(), True),
            StructField("odometer", DoubleType(), True),
            StructField("title_status", StringType(), True),
            StructField("transmission", StringType(), True),
            StructField("vin", StringType(), True),
            StructField("drive", StringType(), True),
            StructField("size", StringType(), True),
            StructField("type", StringType(), True),
            StructField("paint_color", StringType(), True),
            StructField("image_url", StringType(), True),
            StructField("description", StringType(), True),
            # --- CORRECCIÓN: Agregamos la columna faltante AQUÍ ---
            StructField("county", StringType(), True), 
            # ----------------------------------------------------
            StructField("state", StringType(), True),
            StructField("lat", DoubleType(), True),
            StructField("long", DoubleType(), True),
            StructField("posting_date", StringType(), True)
        ])

    def extract(self):
        print("📥 Leyendo dataset desde CSV...")
        schema = self.define_schema()
        # --- BLINDAJE NIVEL 1: Lectura Multilínea ---
        # Esto evita que los "Enter" en la descripción rompan las filas
        df = self.spark.read.csv(
            self.input_path, 
            header=True, 
            schema=schema, 
            multiLine=True,  # Clave para leer descripciones largas
            escape="\"",     # Clave para comillas dentro de comillas
            quote="\""
        )
        print(f"   --> Registros cargados: {df.count()}")
        return df

  # ---------------------------------------------------------
    # 1. CATALOGO MAESTRO DE DATOS (Mini-MDM)
    # Definimos qué modelos son válidos para las marcas principales.
    # Esto actúa como nuestro filtro de verdad.
    # ---------------------------------------------------------
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

    # Modelos genéricos o correcciones directas
    # Si encontramos la clave, la reemplazamos por el valor
    DIRECT_MAPPINGS = {
        "4 runner": "4runner",
        "4- runner": "4runner",
        "4-runner": "4runner",
        "f 150": "f-150",
        "f150": "f-150",
        "pkup": "pickup",
        "super duty": "f-250", # Asunción común
        "p/u": "pickup"
    }

    @staticmethod
    def clean_model_logic(manufacturer, raw_model):
        """
        Lógica pura de Python para limpiar el modelo basándose en la marca.
        """
        if not raw_model: 
            return "unknown"
        
        # 1. Normalización
        manu = str(manufacturer).lower().strip() if manufacturer else ""
        s = str(raw_model).lower().strip()

        # 2. Correcciones Directas (Errores de dedo comunes)
        for bad, good in AutoInsightsETL.DIRECT_MAPPINGS.items():
            if bad in s:
                s = s.replace(bad, good)

        # 3. BÚSQUEDA EN CATÁLOGO (La estrategia ganadora)
        # Si conocemos la marca, buscamos en su lista oficial
        if manu in AutoInsightsETL.KNOWN_MODELS:
            candidates = AutoInsightsETL.KNOWN_MODELS[manu]
            # Buscamos si alguno de los modelos válidos está dentro del texto sucio
            # Ordenamos candidatos por longitud (descendente) para que "grand cherokee" gane a "cherokee"
            # Esto evita que "grand cherokee limited" se mapee solo a "cherokee"
            candidates.sort(key=len, reverse=True) 
            
            for valid_model in candidates:
                # Usamos boundary \b para evitar falsos positivos (ej: no detectar "f-150" dentro de "f-1500")
                if valid_model in s:
                    return valid_model

        # 4. FALLBACK (Heurística para lo que no está en el catálogo)
        # Si llegamos aquí, es una marca rara o un modelo raro.
        
        # Quitamos la marca si aparece en el modelo (ej: "Toyota Camry" -> "Camry")
        s = s.replace(manu, "").strip()
        
        # Limpieza agresiva de basura (palabras comunes en ventas)
        junk_words = [
            "owner", "clean", "title", "rust", "free", "new", "lift", "tires", "wheels", 
            "door", "4wd", "awd", "4x4", "auto", "manual", "cyl", "v6", "v8", "sedan", 
            "suv", "coupe", "convertible", "hatchback", "pickup", "truck", "van", "wagon",
            "edition", "sport", "limited", "lx", "ex", "se", "le", "xlt", "lariat"
        ]
        
        # Regex para eliminar palabras basura
        pattern = r'\b(' + '|'.join(junk_words) + r')\b.*'
        s = re.sub(pattern, '', s) # Corta todo desde la primera palabra basura
        
        # Regex para dejar solo letras, números y guiones
        s = re.sub(r'[^a-z0-9\s-]', '', s).strip()
        
        # Si queda algo, tomamos las primeras 2 palabras máximo
        tokens = s.split()
        if tokens:
            return " ".join(tokens[:2])
            
        return "other"

    def transform(self, df):

        print("🔍 AUTOPSIA DE DATOS: Revisando columna 'state'...")
        
        # TRUCO: Vamos a ver qué hay en 'state' que NO sea de 2 letras.
        # Si la columna estuviera bien, esto debería salir vacío o con pocos errores.
        # Si está mal (desplazada), verás pedazos de descripciones aquí.
        df_dirty_states = df.filter(length(col("state")) > 2).select("id", "state", "price")
        
        print(f"⚠️ Filas con 'state' corrupto (longitud > 2): {df_dirty_states.count()}")
        
        print("--- MUESTRA DE DATOS CORRUPTOS ---")
        df_dirty_states.show(20, truncate=False)
        print("----------------------------------")
        print("🔄 Transformando y limpiando datos (Smart Cleaning)...")

        # Registramos la UDF. Nota: Recibe 2 columnas (Manufacturer y Model)
        clean_udf = udf(AutoInsightsETL.clean_model_logic, StringType())

        # Aplicamos filtro y limpieza
        df_clean = df.filter(
            (col("price") > 500) & 
            (col("price") < 1000000) & 
            (col("year") > 1990) & 
            (col("year") <= 2025) &
            col("manufacturer").isNotNull() &
            col("model").isNotNull()
        ).withColumn(
            # Pasamos STRUCT para enviar múltiples columnas a la UDF
            "model", clean_udf(col("manufacturer"), col("model"))
        )
        
        # Filtrar modelos que quedaron como vacíos o "unknown"
        df_clean = df_clean.filter((col("model") != "") & (col("model") != "unknown"))

        # --- OPTIMIZACIÓN CLAVE: CACHÉ ---
        # Como vamos a usar df_clean para 4 cálculos distintos, lo guardamos en memoria.
        # Esto evita que Spark vuelva a leer el CSV y vuelva a filtrar para cada KPI.
        df_clean.cache()
        print(f"   --> Datos limpios en caché. Total registros: {df_clean.count()}")

        # 2. Agregación Principal (Detalle por Auto)
        df_agg = df_clean.groupBy("manufacturer", "model", "year") \
            .agg(
                round(avg("price"), 2).alias("avg_price"),
                count("*").alias("count")
            )

        # 3. KPI Global: Precio vs Volumen por Año
        df_price_volume = df_clean.groupBy("year") \
            .agg(
                round(avg("price"), 2).alias("avg_price_year"),
                sum(lit(1)).alias("volume_year")
            ) \
            .orderBy("year")

        # 4. Dataset Kilometraje
        df_mileage = df_clean.select("manufacturer", "model", "odometer", "price") \
            .filter(
                col("odometer").isNotNull() & (col("odometer") > 0) & (col("odometer") < 500000)
            )

        # 5. NUEVO: Estadísticas Generales del Mercado
        # Esto genera una sola fila con el resumen total
        print("📊 Calculando estadísticas globales del mercado...")
        df_market_stats = df_clean.agg(
            count("*").alias("total_vehicles"),
            countDistinct("manufacturer").alias("total_brands"),
            countDistinct("model").alias("total_models"),
            round(avg("price"), 2).alias("avg_market_price"),
            max("price").alias("most_expensive"),
            min("price").alias("cheapest"),
            min("year").alias("oldest_year"),
            max("year").alias("newest_year")
        )

        # --- NUEVO: 6. Distribución por Condición (Pastel) ---
        print("📊 Calculando distribución por condición...")
        df_condition = df_clean \
            .fillna("unknown", subset=["condition"]) \
            .groupBy("condition") \
            .count() \
            .orderBy("count", ascending=False)

        # --- NUEVO: 7. Histograma de Precios (Distribución) ---
        print("📊 Calculando histograma de precios...")
        # Estrategia: Dividir precios en rangos de $2,000 para crear las barras
        # Ejemplo: Un auto de $4,500 cae en el rango $4,000
        df_histogram = df_clean.select("price") \
            .withColumn("price_range", floor(col("price") / 2000) * 2000) \
            .groupBy("price_range") \
            .agg(count("*").alias("count")) \
            .orderBy("price_range") \
            .filter(col("price_range") < 100000) # Filtramos exóticos extremos para que la gráfica se vea bien

        # --- BLINDAJE NIVEL 2: Filtro de Calidad para el Mapa ---
        # 8. NUEVO: Distribución Geográfica COMPLETA (Para el Mapa)
        # Agrupamos por estado (ej: 'tx', 'ca', 'fl')
        # Calculamos volumen y precio promedio
        print("🗺️ Calculando datos geográficos...")
        df_geo = df_clean \
            .filter(
                (col("state").isNotNull()) & 
                (length(col("state")) == 2)  # SOLO aceptamos códigos de 2 letras (ej: 'ny', 'ca')
            ) \
            .groupBy("state") \
            .agg(
                count("*").alias("count"),
                round(avg("price"), 2).alias("avg_price")
            ) \
            .orderBy("count", ascending=False)
            # NOTA: AQUÍ NO PONEMOS LIMIT, necesitamos todos los estados.

        # Retornamos df_geo también
        return df_agg, df_price_volume, df_mileage, df_market_stats, df_condition, df_histogram, df_geo

    def load(self, df, collection_name, mode="overwrite"):
        print(f"💾 Guardando colección '{collection_name}'...")
        try:
            df.write.format("mongo") \
                .mode(mode) \
                .option("database", "autoinsights") \
                .option("collection", collection_name) \
                .save()
            print(f"✅ '{collection_name}' guardada.")
        except Exception as e:
            print(f"❌ Error en '{collection_name}': {str(e)}")

    def run(self):
        self.create_spark_session()
        df_raw = self.extract()
        
        # Recibimos TODO
        df_agg, df_price_volume, df_mileage, df_market_stats, df_condition, df_histogram, df_geo = self.transform(df_raw)
        
        # Cargas existentes...
        self.load(df_agg, "precios_promedio")
        self.load(df_price_volume, "kpi_price_volume")
        self.load(df_mileage, "kilometraje")
        self.load(df_market_stats, "estadisticas_mercado")
        
        # Cargas NUEVAS
        self.load(df_condition, "distribucion_condicion")
        self.load(df_histogram, "histograma_precios")

        self.load(df_geo, "distribucion_geo") # Colección para el mapa
        
        print("🚀 Proceso ETL Finalizado con Éxito.")
        self.spark.stop()

if __name__ == "__main__":
    # Ruta ajustada según tu docker-compose (- ./backend/data:/opt/spark/data)
    INPUT_CSV = "/opt/spark/data/vehicles.csv" 
    MONGO_URI = "mongodb://mongodb:27017/autoinsights"

    job = AutoInsightsETL(INPUT_CSV, MONGO_URI)
    job.run()