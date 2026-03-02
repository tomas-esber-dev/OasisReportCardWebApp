import { RatingValue, RATING_LABELS, ENERGY_EMOJI, SPORTSMANSHIP_EMOJI } from "./types";

interface ReportVariables {
  playerName: string;
  coachName: string;
  energyRating: RatingValue;
  sportsmanshipRating: RatingValue;
  coachNotes?: string;
}

const ENERGY_PHRASES: Record<RatingValue, string[]> = {
  1: [
    "seemed a bit low on energy today",
    "had a quieter session than usual",
    "could benefit from more rest and hydration before training",
  ],
  2: [
    "showed some effort but had room to push harder",
    "was getting warmed up throughout the session",
    "showed developing energy levels",
  ],
  3: [
    "brought solid energy to the session",
    "maintained good effort throughout training",
    "showed consistent energy and engagement",
  ],
  4: [
    "brought great energy and enthusiasm to training",
    "was one of the most energetic players on the court today",
    "showed impressive drive and intensity",
  ],
  5: [
    "was absolutely electric on the court today",
    "brought outstanding energy that lifted the whole team",
    "showed incredible intensity and passion throughout the session",
  ],
};

const SPORTSMANSHIP_PHRASES: Record<RatingValue, string[]> = {
  1: [
    "is working on managing emotions during competitive moments",
    "had some challenges with sportsmanship today — something we'll keep working on",
    "needs to focus on respecting teammates and opponents",
  ],
  2: [
    "showed developing sportsmanship skills",
    "is making progress in how they interact with teammates",
    "had some good moments of sportsmanship with room to grow",
  ],
  3: [
    "demonstrated good sportsmanship throughout the session",
    "showed respect for teammates and coaches",
    "was a positive presence in the team environment",
  ],
  4: [
    "showed great sportsmanship and was a real team player",
    "led by example with their attitude and respect for others",
    "was a fantastic teammate today",
  ],
  5: [
    "was an outstanding example of sportsmanship — a true leader",
    "showed exceptional character and respect for everyone on the court",
    "embodied everything we want to see in a Oasis player",
  ],
};

function pickPhrase(phrases: string[]): string {
  return phrases[Math.floor(Math.random() * phrases.length)];
}

export function generateReportText(vars: ReportVariables): string {
  const { playerName, coachName, energyRating, sportsmanshipRating, coachNotes } = vars;
  const firstName = playerName.split(" ")[0];

  const energyLabel = RATING_LABELS[energyRating];
  const sportsLabel = RATING_LABELS[sportsmanshipRating];
  const energyEmoji = ENERGY_EMOJI[energyRating];
  const sportsEmoji = SPORTSMANSHIP_EMOJI[sportsmanshipRating];

  const energyPhrase = pickPhrase(ENERGY_PHRASES[energyRating]);
  const sportsPhrase = pickPhrase(SPORTSMANSHIP_PHRASES[sportsmanshipRating]);

  let report = `Hi! Here's ${firstName}'s Oasis Futsal report from today's session.\n\n`;

  report += `⚡ Energy: ${energyLabel} ${energyEmoji} (${energyRating}/5)\n`;
  report += `${firstName} ${energyPhrase}.\n\n`;

  report += `🤝 Sportsmanship: ${sportsLabel} ${sportsEmoji} (${sportsmanshipRating}/5)\n`;
  report += `${firstName} ${sportsPhrase}.\n\n`;

  if (coachNotes && coachNotes.trim().length > 0) {
    report += `📝 Coach's Notes:\n${coachNotes.trim()}\n\n`;
  }

  report += `Keep up the great work, ${firstName}! See you next session. 🏟️\n— Coach ${coachName}`;

  return report;
}

export function generateSMSText(vars: ReportVariables): string {
  const { playerName, coachName, energyRating, sportsmanshipRating } = vars;
  const firstName = playerName.split(" ")[0];
  const energyEmoji = ENERGY_EMOJI[energyRating];
  const sportsEmoji = SPORTSMANSHIP_EMOJI[sportsmanshipRating];

  let sms = `Oasis Futsal Report for ${firstName} ⚽\n`;
  sms += `Energy: ${energyRating}/5 ${energyEmoji} | Sportsmanship: ${sportsmanshipRating}/5 ${sportsEmoji}\n`;

  if (vars.coachNotes && vars.coachNotes.trim().length > 0) {
    const truncated = vars.coachNotes.trim().substring(0, 100);
    sms += `Coach: ${truncated}${vars.coachNotes.length > 100 ? "..." : ""}\n`;
  }

  sms += `— Coach ${coachName}`;
  return sms;
}
