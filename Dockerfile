FROM node:22-bullseye-slim AS build

WORKDIR /app
COPY package* .
RUN npm install --production=false --prefer-offline --no-audit --no-fund
COPY . .
RUN npx prisma generate
RUN npm run build


FROM node:22-bullseye-slim AS production

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=build --chown=nextjs:nodejs /app/.next ./.next
COPY --from=build --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=build --chown=nextjs:nodejs /app/public ./public

EXPOSE 3000
CMD npm start

