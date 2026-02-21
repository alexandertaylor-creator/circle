"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { BottomNav } from "@/components/BottomNav";

const STORAGE_RECONNECT_NUDGES = "circle_reconnect_nudges";
const STORAGE_EVENT_REMINDERS = "circle_event_reminders";

export default function ProfilePage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reconnectNudges, setReconnectNudges] = useState(true);
  const [eventReminders, setEventReminders] = useState(true);
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth");
        return;
      }
      setUserId(session.user.id);
      setEmail(session.user.email ?? "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", session.user.id)
        .single();
      if (profile) {
        setDisplayName(profile.display_name ?? "");
        setAvatarUrl(profile.avatar_url ?? "");
      }

      try {
        const nudges = localStorage.getItem(STORAGE_RECONNECT_NUDGES);
        setReconnectNudges(nudges !== "false");
      } catch (_) {}
      try {
        const reminders = localStorage.getItem(STORAGE_EVENT_REMINDERS);
        setEventReminders(reminders !== "false");
      } catch (_) {}

      setLoading(false);
    };
    init();
  }, [router]);

  const getInitials = () => {
    if (displayName.trim()) {
      return displayName
        .trim()
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return "?";
  };

  const getColor = () => {
    const str = displayName || email || "?";
    const colors = ["#5A7E9E", "#7E5A9E", "#5A9E78", "#9E7A5A", "#9E5A6A", "#6A9E5A", "#5A8E9E", "#9E905A"];
    return colors[str.charCodeAt(0) % colors.length];
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    e.target.value = "";
    setUploadingPhoto(true);
    const path = "profile/" + userId + "_" + Date.now() + ".jpg";
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) {
      setUploadingPhoto(false);
      console.error(uploadError);
      return;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = urlData.publicUrl + "?t=" + Date.now();
    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
    setAvatarUrl(publicUrl);
    setUploadingPhoto(false);
    setShowSavedMessage(true);
    setTimeout(() => setShowSavedMessage(false), 2000);
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    await supabase.from("profiles").update({ display_name: displayName }).eq("id", userId);
    setEditing(false);
    setSaving(false);
    setShowSavedMessage(true);
    setTimeout(() => setShowSavedMessage(false), 2000);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
  };

  const setReconnectNudgesAndStore = (value: boolean) => {
    setReconnectNudges(value);
    try {
      localStorage.setItem(STORAGE_RECONNECT_NUDGES, String(value));
    } catch (_) {}
  };

  const setEventRemindersAndStore = (value: boolean) => {
    setEventReminders(value);
    try {
      localStorage.setItem(STORAGE_EVENT_REMINDERS, String(value));
    } catch (_) {}
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#141210] flex items-center justify-center">
        <div className="font-serif italic text-[#C8A96E] text-2xl">circle</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#141210] text-[#F0E6D3] pb-24">
      <header className="flex items-center justify-between px-6 py-5 border-b border-[#2E2924] sticky top-0 bg-[#141210] z-10">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm text-[#7A7068] hover:text-[#F0E6D3] transition-colors"
        >
          Back
        </button>
        <span className="font-serif italic text-[#C8A96E] text-lg">Profile</span>
        {showSavedMessage ? (
          <span className="text-sm text-[#C8A96E] font-medium">Saved!</span>
        ) : (
          <div className="w-10" />
        )}
      </header>

      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoSelect}
          />
          <button
            type="button"
            onClick={() => {
              const input = fileInputRef.current;
              if (input) input.click();
            }}
            disabled={uploadingPhoto}
            className="relative w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold text-white flex-shrink-0 overflow-hidden border-2 border-[#2E2924] hover:border-[#C8A96E44] transition-colors disabled:opacity-70"
            style={{ background: avatarUrl ? "transparent" : getColor() }}
          >
            {uploadingPhoto ? (
              <div className="absolute inset-0 flex items-center justify-center bg-[#141210]/80">
                <span className="text-[#C8A96E] text-sm">...</span>
              </div>
            ) : avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              getInitials()
            )}
          </button>
        </div>

        {/* Display name */}
        <div className="bg-[#1C1916] border border-[#2E2924] rounded-2xl p-4">
          <div className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold mb-2">Display name</div>
          {editing ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="flex-1 bg-[#231F1B] border border-[#2E2924] rounded-lg px-3 py-2 text-sm text-[#F0E6D3] placeholder-[#7A7068] outline-none focus:border-[#C8A96E] transition-colors"
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-[#C8A96E] text-[#141210] rounded-lg text-sm font-semibold hover:bg-[#D4B87E] transition-colors disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 border border-[#2E2924] text-[#7A7068] rounded-lg text-sm hover:text-[#F0E6D3] transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-[#F0E6D3]">{displayName || "—"}</span>
              <button
                onClick={() => setEditing(true)}
                className="text-sm text-[#C8A96E] hover:text-[#D4B87E] transition-colors"
              >
                Edit
              </button>
            </div>
          )}
        </div>

        {/* Email (read only) */}
        <div className="bg-[#1C1916] border border-[#2E2924] rounded-2xl p-4">
          <div className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold mb-2">Email</div>
          <div className="text-[#7A7068] text-sm">{email || "—"}</div>
        </div>

        {/* Notification preferences */}
        <div className="bg-[#1C1916] border border-[#2E2924] rounded-2xl p-4">
          <div className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold mb-3">Notifications</div>
          <div className="flex items-center justify-between py-2">
            <span className="text-[#F0E6D3] text-sm">Reconnect nudges</span>
            <button
              type="button"
              role="switch"
              aria-checked={reconnectNudges}
              onClick={() => setReconnectNudgesAndStore(!reconnectNudges)}
              className={`w-11 h-6 rounded-full transition-colors relative ${reconnectNudges ? "bg-[#C8A96E]" : "bg-[#2E2924]"}`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${reconnectNudges ? "left-6" : "left-0.5"}`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-[#2E2924]">
            <span className="text-[#F0E6D3] text-sm">Event reminders</span>
            <button
              type="button"
              role="switch"
              aria-checked={eventReminders}
              onClick={() => setEventRemindersAndStore(!eventReminders)}
              className={`w-11 h-6 rounded-full transition-colors relative ${eventReminders ? "bg-[#C8A96E]" : "bg-[#2E2924]"}`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${eventReminders ? "left-6" : "left-0.5"}`}
              />
            </button>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full py-3 border border-[#6B4A4A] text-[#A67A7A] rounded-xl text-sm font-medium hover:bg-[#2E2222] hover:border-[#8B5A5A] transition-colors"
        >
          Sign out
        </button>
      </div>

      <BottomNav />
    </main>
  );
}
