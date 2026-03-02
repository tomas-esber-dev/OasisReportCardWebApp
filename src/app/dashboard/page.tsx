"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, usePlayerStore } from "@/lib/store";
import { getPlayersByCoach, getLatestReportByPlayer } from "@/lib/firestore";
import { Player, Report } from "@/lib/types";
import { auth } from "@/lib/firebase";
import toast from "react-hot-toast";
import { LogOut, ChevronRight, Users, Search, Clock, CheckCircle2 } from "lucide-react";

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
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export default function DashboardPage() {
  const router = useRouter();
  const { coach, isAuthenticated, isSessionValid, clearAuth } = useAuthStore();
  const { setSelectedPlayer } = usePlayerStore();

  const [players, setPlayers] = useState<Player[]>([]);
  const [latestReports, setLatestReports] = useState<Record<string, Report | null>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Auth guard
  useEffect(() => {
    if (!isAuthenticated || !isSessionValid()) {
      router.replace("/auth");
    }
  }, [isAuthenticated, isSessionValid, router]);

  // Load players then fetch latest report for each
  useEffect(() => {
    if (!coach) return;
    getPlayersByCoach(coach.id)
      .then(async (loadedPlayers) => {
        setPlayers(loadedPlayers);
        // Fetch latest report for each player in parallel
        const reportEntries = await Promise.all(
          loadedPlayers.map(async (p) => {
            const report = await getLatestReportByPlayer(p.id, coach.id).catch(() => null);
            return [p.id, report] as [string, Report | null];
          })
        );
        setLatestReports(Object.fromEntries(reportEntries));
      })
      .catch(() => toast.error("Failed to load players"))
      .finally(() => setLoading(false));
  }, [coach]);

  async function handleSignOut() {
    await auth.signOut();
    clearAuth();
    router.replace("/auth");
  }

  function handleSelectPlayer(player: Player) {
    setSelectedPlayer(player);
    router.push(`/report/${player.id}`);
  }

  const filtered = players.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const avatarColors = [
    "bg-green-500",
    "bg-blue-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-teal-500",
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Hey, Coach {coach?.name?.split(" ")[0]} 👋
            </h1>
            <p className="text-sm text-gray-500">
              {players.length} player{players.length !== 1 ? "s" : ""} on your roster
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Sign out"
          >
            <LogOut size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:bg-gray-50 focus:ring-2 focus:ring-green-500 transition-all"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-200" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Users size={28} className="text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium">
              {search ? "No players found" : "No players assigned yet"}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              {search ? "Try a different search" : "Contact your admin to add players"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-3">
              Your Players
            </p>
            {filtered.map((player, idx) => {
              const latestReport = latestReports[player.id];
              const sentToParent = latestReport?.sentToParent === true;
              const reportAge = latestReport
                ? new Date().getTime() - latestReport.createdAt.getTime()
                : Infinity;
              const isRecent = sentToParent && reportAge < 48 * 60 * 60 * 1000; // ≤48h
              const isOld = sentToParent && reportAge >= 48 * 60 * 60 * 1000;   // >48h

              // Format date for old reports
              const sentDate = latestReport
                ? latestReport.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : "";

              return (
                <button
                  key={player.id}
                  onClick={() => handleSelectPlayer(player)}
                  className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md active:scale-[0.98] transition-all text-left"
                >
                  {/* Avatar */}
                  <div
                    className={`w-12 h-12 rounded-full ${avatarColors[idx % avatarColors.length]} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
                  >
                    {getInitials(player.name)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{player.name}</p>
                    <p className="text-sm text-gray-400 truncate">
                      Parent: {player.parentName}
                    </p>
                    {/* Last sent badge */}
                    {latestReport ? (
                      <div className="flex items-center gap-1 mt-1">
                        {isRecent ? (
                          <CheckCircle2 size={11} className="text-green-500 flex-shrink-0" />
                        ) : isOld ? (
                          <Clock size={11} className="text-gray-400 flex-shrink-0" />
                        ) : (
                          <Clock size={11} className="text-orange-400 flex-shrink-0" />
                        )}
                        <span className={`text-xs ${isRecent ? "text-green-600" : isOld ? "text-gray-400" : "text-orange-500"}`}>
                          {isRecent
                            ? `Sent ${timeAgo(latestReport.createdAt)}`
                            : isOld
                            ? `Last report sent ${sentDate}`
                            : `Draft ${timeAgo(latestReport.createdAt)}`}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-gray-300">No reports yet</span>
                      </div>
                    )}
                  </div>

                  {/* Arrow + status */}
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-green-600 font-medium">Report</span>
                      <ChevronRight size={16} className="text-gray-300" />
                    </div>
                    {isRecent && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                        Sent ✓
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-8 pt-2 text-center">
        <p className="text-xs text-gray-300">Oasis Futsal · Coach Portal</p>
      </div>
    </div>
  );
}
