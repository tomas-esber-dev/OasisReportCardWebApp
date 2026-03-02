"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getOrCreateCoach, saveSession } from "@/lib/firestore";
import { useAuthStore } from "@/lib/store";
import toast from "react-hot-toast";

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
  }
}

export default function AuthPage() {
  const router = useRouter();
  const { isAuthenticated, isSessionValid, setCoach } = useAuthStore();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && isSessionValid()) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isSessionValid, router]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer((s) => s - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  function setupRecaptcha() {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: () => {},
      });
    }
  }

  async function handleSendOTP() {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }

    const formatted = cleaned.startsWith("1") ? `+${cleaned}` : `+1${cleaned}`;

    setLoading(true);
    try {
      setupRecaptcha();
      const result = await signInWithPhoneNumber(auth, formatted, window.recaptchaVerifier);
      setConfirmation(result);
      setStep("otp");
      setResendTimer(30);
      toast.success("Code sent! Check your messages.");
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to send code";
      toast.error(msg.includes("too-many-requests") ? "Too many attempts. Try again later." : "Failed to send code. Check the number and try again.");
      // Reset recaptcha on error
      window.recaptchaVerifier?.clear();
      // @ts-expect-error reset global
      window.recaptchaVerifier = undefined;
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP() {
    const code = otp.join("");
    if (code.length !== 6) {
      toast.error("Please enter the full 6-digit code");
      return;
    }
    if (!confirmation) return;

    setLoading(true);
    try {
      const result = await confirmation.confirm(code);
      const firebaseUser = result.user;
      const userPhone = firebaseUser.phoneNumber ?? "";

      // Get or create coach document (phone = doc ID)
      const coach = await getOrCreateCoach(userPhone);

      // Save 30-day session
      const expiryMs = await saveSession(coach.id, userPhone);
      setCoach(coach, expiryMs);

      toast.success(`Welcome back, Coach ${coach.name}! 🏟️`);
      router.replace("/dashboard");
    } catch (err: unknown) {
      console.error(err);
      toast.error("Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      otpRefs.current[5]?.focus();
    }
  }

  async function handleResend() {
    if (resendTimer > 0) return;
    setOtp(["", "", "", "", "", ""]);
    setStep("phone");
    // @ts-expect-error reset global
    window.recaptchaVerifier = undefined;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-600 to-green-800 flex flex-col">
      {/* Header */}
      <div className="flex flex-col items-center pt-16 pb-8 px-6">
        <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-lg mb-4">
          <span className="text-green-600 text-3xl font-black">O</span>
        </div>
        <h1 className="text-white text-2xl font-bold">Oasis Report Cards</h1>
        <p className="text-green-200 text-sm mt-1">Coach Portal</p>
      </div>

      {/* Card */}
      <div className="flex-1 bg-white rounded-t-3xl px-6 pt-8 pb-10">
        {step === "phone" ? (
          <div className="max-w-sm mx-auto">
            <h2 className="text-gray-900 text-xl font-bold mb-1">Sign In</h2>
            <p className="text-gray-500 text-sm mb-6">
              Enter your phone number to receive a verification code.
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-green-500 transition-colors">
              <span className="px-3 py-3.5 text-gray-500 bg-gray-50 border-r border-gray-200 text-sm font-medium">
                🇺🇸 +1
              </span>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="(555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
                className="flex-1 px-3 py-3.5 text-gray-900 text-base outline-none bg-white"
                autoFocus
              />
            </div>

            <button
              onClick={handleSendOTP}
              disabled={loading}
              className="w-full mt-5 bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-colors text-base"
            >
              {loading ? "Sending..." : "Send Code →"}
            </button>

            <p className="text-center text-xs text-gray-400 mt-4">
              US numbers only. Standard SMS rates may apply.
            </p>
          </div>
        ) : (
          <div className="max-w-sm mx-auto">
            <button
              onClick={() => { setStep("phone"); setOtp(["", "", "", "", "", ""]); }}
              className="flex items-center gap-1 text-green-600 text-sm font-medium mb-6"
            >
              ← Back
            </button>

            <h2 className="text-gray-900 text-xl font-bold mb-1">Enter Code</h2>
            <p className="text-gray-500 text-sm mb-6">
              We sent a 6-digit code to{" "}
              <span className="font-medium text-gray-700">{phone}</span>
            </p>

            {/* OTP Input */}
            <div className="flex gap-2 justify-center mb-6" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className={`w-11 h-14 text-center text-xl font-bold border-2 rounded-xl outline-none transition-colors
                    ${digit ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-900"}
                    focus:border-green-500`}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            <button
              onClick={handleVerifyOTP}
              disabled={loading || otp.join("").length !== 6}
              className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-colors text-base"
            >
              {loading ? "Verifying..." : "Verify & Sign In"}
            </button>

            <div className="text-center mt-4">
              {resendTimer > 0 ? (
                <p className="text-gray-400 text-sm">Resend code in {resendTimer}s</p>
              ) : (
                <button
                  onClick={handleResend}
                  className="text-green-600 text-sm font-medium"
                >
                  Resend code
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Invisible reCAPTCHA */}
      <div ref={recaptchaContainerRef} id="recaptcha-container" />
    </div>
  );
}
