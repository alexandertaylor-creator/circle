"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const ONBOARDING_STORAGE_KEY = "circle_onboarded_v1";

type Screen = {
  id: number;
  icon: string | null;
  title: string;
  body: string;
};

const screens: Screen[] = [
  {
    id: 0,
    icon: null,
    title: "Be a better friend.",
    body: "Circle helps you stay close to the people who matter most.",
  },
  {
    id: 1,
    icon: "🗓",
    title: "Plan more, drift less.",
    body: "Organize events, track hangouts, and never lose touch with the people you care about.",
  },
  {
    id: 2,
    icon: "👥",
    title: "Your circle, organized.",
    body: "Group friends by how you know them, see who you haven't seen in a while, and always know who to reach out to next.",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const totalSteps = screens.length;

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (stored === "true") {
        router.replace("/dashboard");
      }
    } catch {
      // ignore storage errors
    }
  }, [router]);

  const goNext = () => {
    setStep((prev) => (prev < totalSteps - 1 ? prev + 1 : prev));
  };

  const markOnboardedAndGoHome = async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
      }
    } catch {
      // ignore storage errors
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (userId) {
        await supabase
          .from("profiles")
          .update({ onboarded: true })
          .eq("id", userId);
      }
    } catch {
      // ignore profile update errors, still continue
    }

    router.replace("/dashboard");
  };

  const current = screens[step];

  return (
    <main className="h-screen bg-[#141210] text-[#F0E6D3] flex flex-col">
      {/* Header with skip on screens 1 and 2 */}
      <header className="flex items-center justify-between px-6 pt-5 pb-2">
        <div className="w-12" />
        <div className="font-serif italic text-[#C8A96E] text-lg">circle</div>
        {step < totalSteps - 1 ? (
          <button
            type="button"
            onClick={markOnboardedAndGoHome}
            className="text-sm text-[#7A7068] hover:text-[#F0E6D3] transition-colors"
          >
            Skip
          </button>
        ) : (
          <div className="w-12" />
        )}
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 overflow-hidden">
        {/* Large logo on first screen */}
        {current.id === 0 && (
          <div className="mb-10 text-5xl font-serif italic text-[#C8A96E]">circle</div>
        )}
        {/* Icon on subsequent screens */}
        {current.id !== 0 && current.icon && (
          <div className="mb-8 text-5xl" aria-hidden="true">
            {current.icon}
          </div>
        )}

        <div className="w-full max-w-sm transition-opacity duration-300 ease-out">
          <h1 className="text-2xl text-center font-serif text-[#F0E6D3] mb-3">
            {current.title}
          </h1>
          <p className="text-sm text-center text-[#9A8D81] leading-relaxed">
            {current.body}
          </p>
        </div>
      </div>

      {/* Dots + CTA */}
      <div className="px-6 pb-8 pt-2 flex flex-col gap-4">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2">
          {screens.map((s) => (
            <span
              key={s.id}
              className={
                "h-1.5 rounded-full transition-all " +
                (s.id === step ? "w-4 bg-[#C8A96E]" : "w-1.5 bg-[#2E2924]")
              }
            />
          ))}
        </div>

        {/* Navigation / CTA */}
        {step < totalSteps - 1 ? (
          <button
            type="button"
            onClick={goNext}
            className="w-full py-3 bg-[#2E2924] text-[#F0E6D3] rounded-2xl text-sm font-semibold hover:bg-[#3A332D] transition-colors"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={markOnboardedAndGoHome}
            className="w-full py-3 bg-[#C8A96E] text-[#141210] rounded-2xl text-sm font-semibold hover:bg-[#D4B87E] transition-colors"
          >
            Let&apos;s get started
          </button>
        )}
      </div>
    </main>
  );
}

