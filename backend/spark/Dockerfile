# Imagen oficial de Apache Spark (compatible y disponible)
FROM apache/spark:3.5.1

USER root

# Instalamos dependencias de Python adicionales si las necesitas
# (Por ahora solo pyspark viene preinstalado, agregamos requests o pandas si hiciera falta)
# RUN pip install pandas 

# Copiamos el script ETL dentro del contenedor
# Nota: Según tu estructura, el archivo está en backend/spark/etl_job.py
COPY jobs/etl_job.py /opt/spark/jobs/etl_job.py

# Directorio de trabajo
WORKDIR /opt/spark/jobs

# El comando por defecto al levantar el contenedor:
# 1. Usa spark-submit
# 2. Carga el paquete de MongoDB (--packages)
# 3. Ejecuta tu script
CMD ["/opt/spark/bin/spark-submit", \
   "--packages", "org.mongodb.spark:mongo-spark-connector_2.12:3.0.1", \
   "/opt/spark/jobs/etl_job.py"]