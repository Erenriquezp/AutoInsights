# Spark 3.5.1 with Python 3. PySpark ships inside the image (/opt/spark/python), so it is not
# installed with pip: a pip-installed PySpark of another version would shadow it.
# The MongoDB connector is declared in spark-defaults.conf and fetched by Ivy at submit time.
#
# Targets:
#   runtime  master and workers (docker compose default)
#   test     runtime + pytest, runs the ETL tests on the same Spark and Python versions

FROM apache/spark:3.5.1-scala2.12-java17-python3-ubuntu AS runtime

COPY spark-defaults.conf /opt/spark/conf/spark-defaults.conf

# Runs as root, as in v1: as uid 185 (spark) the Ivy cache used by spark.jars.packages has no
# valid home directory. Hardening is tracked separately.
USER root
RUN ln -sf /usr/bin/python3 /usr/bin/python

# No CMD: docker-compose starts each container as master or worker.

FROM runtime AS test
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3-pip \
    && rm -rf /var/lib/apt/lists/*
COPY requirements-test.txt /tmp/requirements-test.txt
RUN pip install --no-cache-dir -r /tmp/requirements-test.txt
ENV PYTHONPATH=/opt/spark/python:/opt/spark/python/lib/py4j-0.10.9.7-src.zip
WORKDIR /work
COPY jobs/ jobs/
COPY tests/ tests/
COPY pyproject.toml .
CMD ["python", "-m", "pytest"]
