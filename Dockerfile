FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY controllers ./controllers
COPY middleware ./middleware
COPY models ./models
COPY routers ./routers
COPY utils ./utils
COPY scripts ./scripts
COPY server.js ./

RUN mkdir -p public/uploads

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "server.js"]
