FROM node:22-bookworm-slim AS builder

WORKDIR /app

RUN npm install -g npm@11.12.1

COPY package.json ./
RUN npm install --include=dev

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV API_HOST=0.0.0.0
ENV API_PORT=4510

RUN npm install -g npm@11.12.1

COPY package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/public/pages /app/public/images /app/src \
  && touch /app/src/prerender-routes.txt \
  && chown -R node:node /app

USER node

EXPOSE 4510

CMD ["node", "dist/main.js"]
