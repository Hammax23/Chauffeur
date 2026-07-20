FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

FROM base AS builder
WORKDIR /app
# Copy the whole project
COPY . .
# Install all dependencies
RUN npm ci

# Generate Prisma Client
RUN cd apps/web && npx prisma generate

# Build the project
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=apps/web

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# The standalone build copies all necessary files to the standalone directory
# and mimics the directory structure of the monorepo workspace.
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
