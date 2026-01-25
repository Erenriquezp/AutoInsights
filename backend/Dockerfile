# Usamos una imagen ligera de Python
FROM python:3.9-slim

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Instalamos las dependencias del sistema necesarias
RUN apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*

# Copiamos e instalamos librerías python
# (FastAPI, Uvicorn para el servidor, PyMongo para la base de datos)
RUN pip install fastapi uvicorn pymongo python-multipart

# El código se montará vía volumen en docker-compose, 
# así que no necesitamos copiarlo aquí para desarrollo.

# Comando por defecto (se sobrescribe en docker-compose)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]