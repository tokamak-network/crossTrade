FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN yarn install --network-timeout 300000

COPY . .

RUN yarn build


FROM node:22-alpine AS production

WORKDIR /app

COPY --from=builder /app/ ./

EXPOSE 3000

CMD ["yarn", "start"]