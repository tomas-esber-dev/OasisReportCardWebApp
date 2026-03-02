export interface Coach {
  id: string;
  name: string;
  phone: string;
  assignedPlayerIds: string[];
  createdAt: Date;
}

export interface Player {
  id: string;
  name: string;
  parentName: string;
  parentPhone: string;
  teamId: string;
  coachId: string;
  avatarInitials?: string;
  createdAt: Date;
}

export interface Report {
  id?: string;
  playerId: string;
  playerName: string;
  coachId: string;
  coachName: string;
  energyRating: number; // 1-5
  sportsmanshipRating: number; // 1-5
  coachNotes: string;
  generatedText: string;
  sentToParent: boolean;
  createdAt: Date;
}

export interface Session {
  coachId: string;
  phone: string;
  createdAt: Date;
  expiresAt: Date;
}

export type RatingValue = 1 | 2 | 3 | 4 | 5;

export const RATING_LABELS: Record<RatingValue, string> = {
  1: "Needs Work",
  2: "Developing",
  3: "Good",
  4: "Great",
  5: "Outstanding",
};

export const ENERGY_EMOJI: Record<RatingValue, string> = {
  1: "😴",
  2: "🙂",
  3: "😊",
  4: "😄",
  5: "🔥",
};

export const SPORTSMANSHIP_EMOJI: Record<RatingValue, string> = {
  1: "😤",
  2: "😐",
  3: "🤝",
  4: "👏",
  5: "🏆",
};
