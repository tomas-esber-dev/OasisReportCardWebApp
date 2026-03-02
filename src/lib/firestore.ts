import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { Coach, Player, Report } from "./types";

// ─── Coaches ────────────────────────────────────────────────────────────────
// Coach document ID = E.164 phone number (e.g. "+13059155976")

export async function getCoachByPhone(phone: string): Promise<Coach | null> {
  const ref = doc(db, "coaches", phone);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Coach;
}

export async function getOrCreateCoach(phone: string): Promise<Coach> {
  const ref = doc(db, "coaches", phone);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() } as Coach;
  }
  // Auto-create coach on first login
  const newCoach: Omit<Coach, "id"> = {
    name: "Coach",
    phone,
    assignedPlayerIds: [],
    createdAt: new Date(),
  };
  await setDoc(ref, { ...newCoach, createdAt: serverTimestamp() });
  return { id: phone, ...newCoach };
}

export async function getCoachById(coachId: string): Promise<Coach | null> {
  return getCoachByPhone(coachId);
}

// ─── Players ────────────────────────────────────────────────────────────────

export async function getPlayersByCoach(coachId: string): Promise<Player[]> {
  const q = query(
    collection(db, "players"),
    where("coachId", "==", coachId),
    orderBy("name", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Player));
}

export async function getPlayerById(playerId: string): Promise<Player | null> {
  const ref = doc(db, "players", playerId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Player;
}

// ─── Reports ────────────────────────────────────────────────────────────────

export async function saveReport(report: Omit<Report, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(db, "reports"), {
    ...report,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getReportsByPlayer(playerId: string): Promise<Report[]> {
  const q = query(
    collection(db, "reports"),
    where("playerId", "==", playerId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
    } as Report;
  });
}

export async function markReportSent(reportId: string): Promise<void> {
  await setDoc(doc(db, "reports", reportId), { sentToParent: true }, { merge: true });
}

export async function getLatestReportByPlayer(playerId: string, coachId: string): Promise<Report | null> {
  const q = query(
    collection(db, "reports"),
    where("playerId", "==", playerId),
    where("coachId", "==", coachId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  const data = d.data();
  return {
    id: d.id,
    ...data,
    createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
  } as Report;
}

// ─── Session ────────────────────────────────────────────────────────────────
// Session document ID = coach phone number

export async function saveSession(coachId: string, phone: string): Promise<number> {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  await setDoc(doc(db, "sessions", phone), {
    coachId: phone,
    phone,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
  });
  return expiresAt.getTime();
}

export async function validateSession(coachId: string): Promise<boolean> {
  const ref = doc(db, "sessions", coachId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;
  const data = snap.data();
  const expiresAt = (data.expiresAt as Timestamp)?.toDate();
  return expiresAt ? expiresAt > new Date() : false;
}
