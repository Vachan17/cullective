FROM node:20-alpine
RUN apk add --no-cache vips-dev python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN mkdir -p logs
EXPOSE 5000
CMD ["node", "index.js"]
