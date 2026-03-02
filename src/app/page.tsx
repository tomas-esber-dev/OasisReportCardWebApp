"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isSessionValid } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && isSessionValid()) {
      router.replace("/dashboard");
    } else {
      router.replace("/auth");
    }
  }, [isAuthenticated, isSessionValid, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-white text-2xl font-bold animate-pulse">
          O
        </div>
        <p className="text-gray-500 text-sm">Loading Oasis...</p>
      </div>
    </div>
  );
}
