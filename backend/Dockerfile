# Imagem do backend para o Cloud Run (`npm run deploy`).
FROM node:24-slim

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY scripts ./scripts

# Não roda como root dentro do container.
USER node

# O Cloud Run define a variável PORT (8080 por padrão).
EXPOSE 8080
CMD ["node", "src/index.js"]
