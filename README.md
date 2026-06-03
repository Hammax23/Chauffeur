# SARJ Worldwide - Chauffeur Monorepo

Premium chauffeur booking platform with Web & Mobile apps.

## Project Structure

```
Chauffeur/
├── apps/
│   ├── web/                    # Next.js Website
│   │   ├── src/
│   │   ├── prisma/
│   │   └── package.json
│   │
│   └── mobile/                 # React Native Expo App
│       ├── app/                # Expo Router screens
│       ├── src/
│       └── package.json
│
├── packages/
│   └── shared/                 # Shared code (types, utils, constants)
│       └── src/
│
├── package.json                # Root workspace config
└── turbo.json                  # Turborepo config
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- Expo CLI: `npm install -g expo-cli`
- EAS CLI (for builds): `npm install -g eas-cli`

### Installation

```bash
# 1. Install all dependencies (from root)
npm install

# 2. Setup environment files
cp apps/web/.env.local.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
```

### Development

```bash
# Run website
npm run dev:web
# or
npm run dev

# Run mobile app
npm run dev:mobile
# or
cd apps/mobile && npx expo start
```

## Mobile App Commands

```bash
cd apps/mobile

# Start development
npx expo start

# Run on specific platform
npx expo start --android
npx expo start --ios

# Build for production
eas build --platform android
eas build --platform ios
```

## Web Deployment (VPS)

Path on server (adjust if different): `/var/www/sarjworldwide/apps/web`

```bash
ssh root@your-vps
cd /var/www/sarjworldwide
git pull

cd apps/web
npm install
npx prisma generate
# DATABASE_URL must point to Postgres ON THE VPS (see .env.production.example)
npx prisma db push   # first deploy only, if schema not applied yet

cp .env.production.example .env   # then edit .env with real DATABASE_URL, JWT_SECRET, etc.
npm run build

cd /var/www/sarjworldwide
pm2 start ecosystem.config.js    # first time
# OR after code/env changes:
pm2 restart sarj-worldwide --update-env

pm2 logs sarj-worldwide --lines 50   # if dashboard shows errors / high ↺ restarts
```

**Dashboard shows "Failed to fetch dashboard data"** — almost always:

1. **`DATABASE_URL` missing** — PM2 only had `PORT`/`NODE_ENV`; copy `.env` from local to VPS and restart with `--update-env`.
2. **Postgres not running or wrong host** — local `localhost:5433` does not exist on VPS unless you installed PostgreSQL there and imported data.
3. **Empty database** — connection works but no rows yet (stats show 0, not an error). Error banner = API crash, not empty data.

Use `apps/web/.env.production.example` as the checklist of required variables.

## Mobile Deployment

```bash
cd apps/mobile

# Build for stores
eas build --platform all

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

## Tech Stack

### Web (apps/web)
- Next.js 15
- TypeScript
- Tailwind CSS
- Prisma (Database ORM)
- Stripe (Payments)

### Mobile (apps/mobile)
- React Native
- Expo SDK 51
- Expo Router
- NativeWind (Tailwind for RN)

### Shared (packages/shared)
- TypeScript types
- Utility functions
- Constants & API endpoints

## API Integration

Mobile app uses the same API endpoints as the website:
- Base URL: `https://sarjworldwide.com/api`
- Authentication: JWT tokens
- Endpoints defined in `packages/shared/src/constants`

## Notes

- All lint errors after setup will resolve after running `npm install`
- Mobile app requires Expo Go app for development testing
- Production builds require EAS account setup(App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Linting:** ESLint

## Project Structure
```
src/
├── app/
│   ├── layout.tsx    # Root layout
│   ├── page.tsx      # Home page
│   └── globals.css   # Global styles
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
