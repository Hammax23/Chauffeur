FROM node:20-alpine

WORKDIR /app

# Prisma's query engine needs OpenSSL on Alpine
RUN apk add --no-cache openssl

# Copy the entire monorepo
COPY . .

# Install dependencies
RUN npm install

# Generate Prisma Client (needed before building)
RUN cd apps/web && npx prisma generate

# Copy the env file into the Next.js app directory so it has the Stripe API key during the build
RUN cp .env apps/web/.env || true

# Build the app
# IPv4-only so next/font can reach Google Fonts from inside Docker
RUN NODE_OPTIONS="--dns-result-order=ipv4first --no-network-family-autoselection" npm run build

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "run", "start"]
