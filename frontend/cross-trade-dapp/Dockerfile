FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN apk add --no-cache python3 make g++ && npm ci --legacy-peer-deps

COPY . .

RUN npm run build


FROM node:22-alpine AS production

WORKDIR /app

COPY --from=builder /app/ ./

EXPOSE 3000

CMD ["npm", "start"]