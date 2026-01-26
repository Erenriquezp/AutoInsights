# Imagen oficial de Apache Spark (compatible y disponible)
FROM apache/spark:3.5.1

USER root

# Instalamos pip y las dependencias necesarias
RUN apt-get update && apt-get install -y python3-pip && rm -rf /var/lib/apt/lists/*
RUN pip install pyspark pymongo pandas

# Creamos un enlace simbólico de python a python3
RUN ln -s /usr/bin/python3 /usr/bin/python

# OJO: NO ponemos CMD ni ENTRYPOINT aquí para ejecutar el script.
# Dejamos que la imagen base inicie el Master/Worker por defecto.