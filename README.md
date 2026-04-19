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

```bash
# SSH into VPS
ssh user@your-vps

# Pull latest code
cd /var/www/chauffeur
git pull origin main

# Build and restart
cd apps/web
npm install
npm run build
pm2 restart chauffeur
```

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
