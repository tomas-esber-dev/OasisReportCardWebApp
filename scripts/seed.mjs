/**
 * Oasis Report Cards — Firestore Seed Script
 *
 * Usage:
 *   1. Download your Firebase service account key from:
 *      Firebase Console → Project Settings → Service Accounts → Generate new private key
 *   2. Save it as scripts/serviceAccountKey.json (DO NOT commit this file!)
 *   3. Run: node scripts/seed.mjs
 *
 * Coach document ID = E.164 phone number (e.g. "+13059155976")
 * Player coachId    = coach phone number
 *
 * Replace COACH_PHONE below with the real coach's phone number.
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, "serviceAccountKey.json"), "utf8")
);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ─── Replace these with real phone numbers ───────────────────────────────────
const COACH_1_PHONE = "+18339584652"; // Tomas — replace with real number
const COACH_2_PHONE = "+15550000002"; // Sofia   — replace with real number

const coaches = [
  {
    id: COACH_1_PHONE,
    name: "Tomas Esber",
    phone: COACH_1_PHONE,
    assignedPlayerIds: ["player_001", "player_002", "player_003"],
    createdAt: new Date(),
  },
  {
    id: COACH_2_PHONE,
    name: "Sofia Reyes",
    phone: COACH_2_PHONE,
    assignedPlayerIds: ["player_004", "player_005"],
    createdAt: new Date(),
  },
];

const players = [
  {
    id: "player_001",
    name: "Marco Torres",
    parentName: "Elena Torres",
    parentPhone: "+13059155976",
    teamId: "team_a",
    coachId: COACH_1_PHONE,
    createdAt: new Date(),
  },
  {
    id: "player_002",
    name: "Liam Johnson",
    parentName: "Sarah Johnson",
    parentPhone: "+13059155976",
    teamId: "team_a",
    coachId: COACH_1_PHONE,
    createdAt: new Date(),
  },
  {
    id: "player_003",
    name: "Aiden Park",
    parentName: "James Park",
    parentPhone: "+13059155976",
    teamId: "team_a",
    coachId: COACH_1_PHONE,
    createdAt: new Date(),
  },
  {
    id: "player_004",
    name: "Isabella Cruz",
    parentName: "Miguel Cruz",
    parentPhone: "+15550000013",
    teamId: "team_b",
    coachId: COACH_2_PHONE,
    createdAt: new Date(),
  },
  {
    id: "player_005",
    name: "Noah Williams",
    parentName: "Diane Williams",
    parentPhone: "+15550000014",
    teamId: "team_b",
    coachId: COACH_2_PHONE,
    createdAt: new Date(),
  },
];

// ─── Seed ─────────────────────────────────────────────────────────────────────
async function seed() {
  console.log("🌱 Seeding Firestore...\n");

  for (const coach of coaches) {
    const { id, ...data } = coach;
    await db.collection("coaches").doc(id).set(data);
    console.log(`✅ Coach: ${coach.name} (${coach.phone})`);
  }

  for (const player of players) {
    const { id, ...data } = player;
    await db.collection("players").doc(id).set(data);
    console.log(`✅ Player: ${player.name} → Coach ${player.coachId}`);
  }

  console.log("\n🎉 Seed complete!");
  console.log("\n📝 Next steps:");
  console.log("   1. Deploy rules: firebase deploy --only firestore:rules");
  console.log("   2. Run the app: npm run dev");
  console.log("   3. Sign in with the coach phone number to test");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
