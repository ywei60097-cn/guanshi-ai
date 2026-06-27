FROM node:22-alpine

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY bazi-engine.js scene-advice.js ./
COPY server ./server

ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "server/index.js"]
