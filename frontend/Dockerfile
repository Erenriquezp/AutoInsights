# Usamos Node.js versión LTS
FROM node:22-alpine

# Directorio de trabajo
WORKDIR /app

# Copiamos los archivos de definición de paquetes primero (para aprovechar caché)
COPY package.json package-lock.json* ./

# Instalamos dependencias
RUN npm install

# Copiamos el resto del código fuente
COPY . .

# Exponemos el puerto
EXPOSE 5173

# Comando de inicio
CMD ["npm", "run", "dev", "--", "--host"]