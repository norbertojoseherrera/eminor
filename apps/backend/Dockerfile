FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma/ ./prisma/
COPY prisma.config.ts ./

RUN npm install

# Generate Prisma client before TypeScript compilation
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" \
    npx prisma generate

COPY . .
RUN npm run build

EXPOSE 3000

CMD sh -c "npx prisma migrate deploy && node dist/src/main"
