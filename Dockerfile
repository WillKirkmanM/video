FROM oven/bun:latest

WORKDIR /app

COPY package*.json ./
COPY bun.lock ./
RUN bun install

COPY . .

RUN bun run build

EXPOSE 1994

CMD ["bun", "preview" "--port", "1994"]