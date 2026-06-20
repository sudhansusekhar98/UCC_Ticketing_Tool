FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev --ignore-scripts; else npm install --omit=dev --ignore-scripts; fi

COPY . .

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=384"

EXPOSE 3000

CMD ["node", "server.js"]
