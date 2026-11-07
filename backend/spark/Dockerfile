# Spark 3.5.1 with Python 3. PySpark ships inside the image (/opt/spark/python), so it is not
# installed with pip: a pip-installed PySpark of another version would shadow it.
# The MongoDB connector is declared in spark-defaults.conf and fetched by Ivy at submit time.
FROM apache/spark:3.5.1-scala2.12-java17-python3-ubuntu

COPY spark-defaults.conf /opt/spark/conf/spark-defaults.conf

# Runs as root, as in v1: as uid 185 (spark) the Ivy cache used by spark.jars.packages has no
# valid home directory. Hardening is tracked separately.
USER root
RUN ln -sf /usr/bin/python3 /usr/bin/python

# No CMD: docker-compose starts each container as master or worker.
