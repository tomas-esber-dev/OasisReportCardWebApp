"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthStore, usePlayerStore } from "@/lib/store";
import { getPlayerById, saveReport, markReportSent, getLatestReportByPlayer } from "@/lib/firestore";
import { generateReportText } from "@/lib/reportTemplate";
import { Player, Report, RatingValue, RATING_LABELS, ENERGY_EMOJI, SPORTSMANSHIP_EMOJI } from "@/lib/types";
import toast from "react-hot-toast";
import { ArrowLeft, Send, Zap, Trophy, Mic, MicOff, RotateCcw, CheckCircle, AlertTriangle } from "lucide-react";

type Step = "form" | "preview" | "sent";

function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

export default function ReportPage() {
  const router = useRouter();
  const params = useParams();
  const playerId = params.playerId as string;

  const { coach, isAuthenticated, isSessionValid } = useAuthStore();
  const { selectedPlayer, setSelectedPlayer } = usePlayerStore();

  const [player, setPlayer] = useState<Player | null>(selectedPlayer);
  const [loading, setLoading] = useState(!selectedPlayer);
  const [latestReport, setLatestReport] = useState<Report | null>(null);
  const [step, setStep] = useState<Step>("form");
  const [sending, setSending] = useState(false);
  const [savedReportId, setSavedReportId] = useState<string | null>(null); // kept for future use

  // Form state
  const [energyRating, setEnergyRating] = useState<RatingValue>(3);
  const [sportsmanshipRating, setSportsmanshipRating] = useState<RatingValue>(3);
  const [coachNotes, setCoachNotes] = useState("");
  const [generatedText, setGeneratedText] = useState("");

  // Voice input
  const [isRecording, setIsRecording] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Auth guard
  useEffect(() => {
    if (!isAuthenticated || !isSessionValid()) {
      router.replace("/auth");
    }
  }, [isAuthenticated, isSessionValid, router]);

  // Load player if not in store
  useEffect(() => {
    if (!selectedPlayer && playerId) {
      getPlayerById(playerId)
        .then((p) => {
          if (!p) { toast.error("Player not found"); router.replace("/dashboard"); return; }
          setPlayer(p);
          setSelectedPlayer(p);
        })
        .catch(() => { toast.error("Failed to load player"); router.replace("/dashboard"); })
        .finally(() => setLoading(false));
    }
  }, [playerId, selectedPlayer, setSelectedPlayer, router]);

  // Load latest report for this player
  useEffect(() => {
    if (!playerId || !coach) return;
    getLatestReportByPlayer(playerId, coach.id)
      .then(setLatestReport)
      .catch(() => null);
  }, [playerId, coach]);

  function handleGeneratePreview() {
    if (!player || !coach) return;
    const text = generateReportText({
      playerName: player.name,
      coachName: coach.name,
      energyRating,
      sportsmanshipRating,
      coachNotes,
    });
    setGeneratedText(text);
    setStep("preview");
  }

  async function handleSendReport() {
    if (!player || !coach) return;
    setSending(true);
    try {
      // Save report to Firestore
      const reportId = await saveReport({
        playerId: player.id,
        playerName: player.name,
        coachId: coach.id,
        coachName: coach.name,
        energyRating,
        sportsmanshipRating,
        coachNotes,
        generatedText,
        sentToParent: false,
      });
      setSavedReportId(reportId);

      // Send SMS via API route
      const res = await fetch("/api/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: player.parentPhone,
          message: generatedText,
          reportId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to send SMS");
      }

      await markReportSent(reportId);
      setStep("sent");
      toast.success("Report sent to parent! 🎉");
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to send report";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }

  function handleVoiceInput() {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast.error("Voice input not supported on this browser");
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => {
      setIsRecording(false);
      toast.error("Voice input failed. Try again.");
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setCoachNotes((prev) => (prev ? `${prev} ${transcript}` : transcript));
      toast.success("Voice note added!");
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function handleReset() {
    setStep("form");
    setEnergyRating(3);
    setSportsmanshipRating(3);
    setCoachNotes("");
    setGeneratedText("");
    setSavedReportId(null);
    // Refresh latest report
    if (coach) getLatestReportByPlayer(playerId, coach.id).then(setLatestReport).catch(() => null);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-600 animate-pulse" />
          <p className="text-gray-400 text-sm">Loading player...</p>
        </div>
      </div>
    );
  }

  if (!player) return null;

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const alreadySentToday = latestReport?.sentToParent === true &&
    latestReport.createdAt &&
    (new Date().getTime() - latestReport.createdAt.getTime()) < 24 * 60 * 60 * 1000;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => step === "preview" ? setStep("form") : router.back()}
            className="p-2 -ml-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-xs">
              {getInitials(player.name)}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{player.name}</p>
              <p className="text-xs text-gray-400">
                {step === "form" ? "Create Report" : step === "preview" ? "Preview" : "Sent ✓"}
              </p>
            </div>
          </div>
          {/* Step indicator */}
          <div className="flex gap-1">
            {(["form", "preview", "sent"] as Step[]).map((s, i) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  step === s ? "w-6 bg-green-500" :
                  (["form", "preview", "sent"].indexOf(step) > i) ? "w-3 bg-green-300" : "w-3 bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── FORM STEP ── */}
      {step === "form" && (
        <div className="flex-1 px-4 py-5 space-y-5 pb-32">

          {/* Already-sent warning banner */}
          {latestReport?.sentToParent && (
            <div className={`rounded-2xl p-3.5 flex items-start gap-3 ${alreadySentToday ? "bg-orange-50 border border-orange-200" : "bg-blue-50 border border-blue-100"}`}>
              <AlertTriangle size={16} className={`flex-shrink-0 mt-0.5 ${alreadySentToday ? "text-orange-500" : "text-blue-400"}`} />
              <div>
                <p className={`text-xs font-semibold ${alreadySentToday ? "text-orange-700" : "text-blue-700"}`}>
                  {alreadySentToday ? "Report already sent today" : "Previous report sent"}
                </p>
                <p className={`text-xs mt-0.5 ${alreadySentToday ? "text-orange-600" : "text-blue-600"}`}>
                  Last report was sent {timeAgo(latestReport.createdAt)}. You can still send a new one.
                </p>
              </div>
            </div>
          )}

          {/* Energy Rating */}
          <RatingCard
            icon={<Zap size={18} className="text-yellow-500" />}
            title="Energy"
            subtitle="How was their effort & intensity?"
            value={energyRating}
            onChange={(v) => setEnergyRating(v)}
            emojiMap={ENERGY_EMOJI}
          />

          {/* Sportsmanship Rating */}
          <RatingCard
            icon={<Trophy size={18} className="text-blue-500" />}
            title="Sportsmanship"
            subtitle="How did they treat teammates & coaches?"
            value={sportsmanshipRating}
            onChange={(v) => setSportsmanshipRating(v)}
            emojiMap={SPORTSMANSHIP_EMOJI}
          />

          {/* Coach Notes */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Coach Notes</h3>
                <p className="text-xs text-gray-400">Optional — specific feedback</p>
              </div>
              <button
                onClick={handleVoiceInput}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  isRecording
                    ? "bg-red-100 text-red-600 animate-pulse"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
                {isRecording ? "Stop" : "Voice"}
              </button>
            </div>
            <textarea
              value={coachNotes}
              onChange={(e) => setCoachNotes(e.target.value)}
              placeholder="e.g. Great improvement on passing today. Keep working on positioning..."
              rows={4}
              className="w-full text-sm text-gray-800 placeholder-gray-300 outline-none resize-none leading-relaxed"
            />
            {coachNotes && (
              <div className="flex justify-end mt-1">
                <span className="text-xs text-gray-300">{coachNotes.length} chars</span>
              </div>
            )}
          </div>

          {/* Summary preview */}
          <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
            <p className="text-xs font-semibold text-green-700 mb-2">Report Summary</p>
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-2xl">{ENERGY_EMOJI[energyRating]}</p>
                <p className="text-xs text-gray-500 mt-0.5">Energy</p>
                <p className="text-sm font-bold text-gray-800">{energyRating}/5</p>
              </div>
              <div className="w-px bg-green-200" />
              <div className="text-center">
                <p className="text-2xl">{SPORTSMANSHIP_EMOJI[sportsmanshipRating]}</p>
                <p className="text-xs text-gray-500 mt-0.5">Sportsmanship</p>
                <p className="text-sm font-bold text-gray-800">{sportsmanshipRating}/5</p>
              </div>
              <div className="w-px bg-green-200" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">Sending to</p>
                <p className="text-sm font-semibold text-gray-800 truncate">{player.parentName}</p>
                <p className="text-xs text-gray-400 truncate">{player.parentPhone}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PREVIEW STEP ── */}
      {step === "preview" && (
        <div className="flex-1 px-4 py-5 pb-32">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-600 text-sm">📱</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700">SMS Preview</p>
                <p className="text-xs text-gray-400">To: {player.parentName} · {player.parentPhone}</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {generatedText}
              </p>
            </div>
            <p className="text-xs text-gray-400 mt-3 text-right">
              ~{Math.ceil(generatedText.length / 160)} SMS segment{Math.ceil(generatedText.length / 160) !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}

      {/* ── SENT STEP ── */}
      {step === "sent" && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center pb-20">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-5">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Report Sent! 🎉</h2>
          <p className="text-gray-500 text-sm mb-1">
            {player.parentName} received {player.name}&apos;s report.
          </p>
          <p className="text-gray-400 text-xs mb-8">{player.parentPhone}</p>

          <div className="w-full space-y-3">
            <button
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white font-semibold py-3.5 rounded-xl"
            >
              <RotateCcw size={16} />
              New Report for {player.name.split(" ")[0]}
            </button>
            <button
              onClick={() => router.replace("/dashboard")}
              className="w-full py-3.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold"
            >
              Back to Roster
            </button>
          </div>
        </div>
      )}

      {/* ── BOTTOM ACTION BAR ── */}
      {step !== "sent" && (
        <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-gray-100 px-4 py-4 pb-8">
          {step === "form" ? (
            <button
              onClick={handleGeneratePreview}
              className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold py-3.5 rounded-xl transition-colors text-base"
            >
              Preview Report →
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setStep("form")}
                className="flex-1 py-3.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold"
              >
                Edit
              </button>
              <button
                onClick={handleSendReport}
                disabled={sending}
                className="flex-2 flex-[2] flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-colors"
              >
                <Send size={16} />
                {sending ? "Sending..." : "Send to Parent"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Rating Card Component ───────────────────────────────────────────────────

interface RatingCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  value: RatingValue;
  onChange: (v: RatingValue) => void;
  emojiMap: Record<RatingValue, string>;
}

function RatingCard({ icon, title, subtitle, value, onChange, emojiMap }: RatingCardProps) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
        <span className="ml-auto text-xl">{emojiMap[value]}</span>
      </div>
      <p className="text-xs text-gray-400 mb-4">{subtitle}</p>

      {/* Rating buttons */}
      <div className="flex gap-2">
        {([1, 2, 3, 4, 5] as RatingValue[]).map((rating) => (
          <button
            key={rating}
            onClick={() => onChange(rating)}
            className={`flex-1 flex flex-col items-center py-2.5 rounded-xl border-2 transition-all active:scale-95 ${
              value === rating
                ? "border-green-500 bg-green-50"
                : "border-gray-100 bg-gray-50 hover:border-gray-200"
            }`}
          >
            <span className="text-lg leading-none mb-1">{emojiMap[rating as RatingValue]}</span>
            <span
              className={`text-xs font-bold ${
                value === rating ? "text-green-600" : "text-gray-400"
              }`}
            >
              {rating}
            </span>
          </button>
        ))}
      </div>

      {/* Label */}
      <p className={`text-center text-xs font-medium mt-2 ${value >= 4 ? "text-green-600" : value <= 2 ? "text-orange-500" : "text-gray-500"}`}>
        {RATING_LABELS[value]}
      </p>
    </div>
  );
}
