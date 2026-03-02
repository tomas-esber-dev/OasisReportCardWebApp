# Oasis Report Cards 🏟️

A mobile-first webapp for Oasis Futsal coaches to generate and send player reports to parents via SMS.

## Features

- 📱 **Mobile-first** — designed for coaches on their phones
- 🔐 **Phone OTP Auth** — coaches sign in with their phone number, session lasts 30 days
- 👥 **Player Roster** — coaches see only their assigned players
- ⚡ **Report Generation** — rate Energy (1–5) and Sportsmanship (1–5) with emoji toggles
- 🎙️ **Voice Input** — tap the mic to dictate coach notes (Chrome/Safari)
- 📝 **Smart Templates** — ratings are mapped to natural language phrases
- 📤 **SMS Delivery** — reports sent to parents via Twilio
- 🔥 **Firestore** — all reports saved with full history

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14+ (App Router), TypeScript, Tailwind CSS |
| Auth | Firebase Phone Auth (OTP) |
| Database | Firestore |
| State | Zustand (with localStorage persistence) |
| SMS | Twilio |
| Hosting | Firebase Hosting |

---

## Getting Started

### 1. Clone & Install

```bash
cd oasis-report-cards
npm install
```

### 2. Configure Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your credentials:

```bash
cp .env.local.example .env.local
```

**Firebase** — get from [Firebase Console](https://console.firebase.google.com) → Project Settings → Your Apps → Web App:
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

**Twilio** — get from [Twilio Console](https://console.twilio.com):
```
TWILIO_ACCOUNT_SID=ACxxxxxxxx...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
```

### 3. Enable Firebase Phone Auth

1. Go to Firebase Console → Authentication → Sign-in method
2. Enable **Phone** provider
3. For development, add test phone numbers under "Phone numbers for testing"
   - e.g. `+15550000001` with code `123456`

### 4. Set Up Firestore

1. Go to Firebase Console → Firestore Database → Create database
2. Deploy security rules:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase deploy --only firestore:rules
   ```

### 5. Seed Test Data

```bash
npm install -D firebase-admin
# Download service account key from Firebase Console → Project Settings → Service Accounts
# Save as scripts/serviceAccountKey.json (never commit this!)
node scripts/seed.mjs
```

> ⚠️ Update phone numbers in `scripts/seed.mjs` to match your test numbers before seeding.

### 6. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your phone or browser.

---

## Deployment to Firebase Hosting

```bash
# Build the app
npm run build

# Deploy
firebase deploy --only hosting
```

> **Note:** Since this uses Next.js API routes (for Twilio), you'll need to either:
> - Use **Firebase App Hosting** (recommended — supports Next.js natively), or
> - Deploy API routes as **Firebase Cloud Functions** separately

---

## Project Structure

```
src/
├── app/
│   ├── auth/page.tsx          # Phone OTP login
│   ├── dashboard/page.tsx     # Coach roster view
│   ├── report/[playerId]/     # Report creation flow
│   │   └── page.tsx
│   └── api/send-report/       # Twilio SMS endpoint
│       └── route.ts
├── lib/
│   ├── firebase.ts            # Firebase app init
│   ├── firestore.ts           # Firestore CRUD helpers
│   ├── store.ts               # Zustand state (auth + players)
│   ├── types.ts               # TypeScript interfaces + constants
│   └── reportTemplate.ts      # Report text generation engine
scripts/
└── seed.mjs                   # Firestore seed script
firestore.rules                # Security rules
firestore.indexes.json         # Composite indexes
```

---

## Firestore Data Model

```
coaches/{coachId}
  name: string
  phone: string              # E.164 format e.g. +15551234567
  assignedPlayerIds: string[]

players/{playerId}
  name: string
  parentName: string
  parentPhone: string        # E.164 format
  teamId: string
  coachId: string

reports/{reportId}
  playerId: string
  playerName: string
  coachId: string
  coachName: string
  energyRating: 1-5
  sportsmanshipRating: 1-5
  coachNotes: string
  generatedText: string
  sentToParent: boolean
  createdAt: timestamp

sessions/{coachId}
  coachId: string
  phone: string
  createdAt: timestamp
  expiresAt: timestamp       # 30 days from login
```

---

## Adding Coaches & Players

Currently managed via the seed script or directly in Firebase Console. To add a new coach:

1. Create a document in `coaches/` collection with their phone number (E.164 format)
2. Create player documents in `players/` with `coachId` matching the coach document ID
3. The coach document ID **must match** their Firebase Auth UID after first login

> 💡 **Tip:** After a coach logs in for the first time, their Firebase Auth UID is their phone number's UID. You can find it in Firebase Console → Authentication → Users. Update the Firestore coach document ID to match.

---

## Future Roadmap

- [ ] **AI-generated reports** — OpenAI/Gemini integration via Cloud Function trigger
- [ ] **Admin panel** — web UI to manage coaches and players
- [ ] **Report history** — coaches can view past reports per player
- [ ] **Multi-language** — Spanish support for parent SMS
- [ ] **Push notifications** — remind coaches to submit reports after sessions
- [ ] **WhatsApp delivery** — via Twilio WhatsApp API

---

## Twilio Setup Guide

1. Sign up at [twilio.com](https://www.twilio.com)
2. Get a phone number: Console → Phone Numbers → Manage → Buy a number
   - Make sure it has SMS capability
   - US numbers start at ~$1/month
3. Copy your Account SID and Auth Token from the main dashboard
4. Add them to `.env.local`

**SMS Costs:** ~$0.0079 per SMS segment (160 chars). A typical report is 2–3 segments ≈ $0.02 per report.
