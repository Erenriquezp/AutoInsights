# Usamos Node.js versión LTS
FROM node:22-alpine

# Directorio de trabajo
WORKDIR /app

# Copiamos los archivos de definición de paquetes primero (para aprovechar caché)
COPY package.json package-lock.json* ./

# Instalamos dependencias
# Nota: Si no existe package.json aún, esto fallará, 
# pero es necesario para la estructura final.
# Para la primera vez, puedes comentar esta línea o crear un package.json vacío.
RUN npm install

# Exponemos el puerto
EXPOSE 5173

# Comando de inicio
CMD ["npm", "run", "dev", "--", "--host"]