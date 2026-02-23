"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

const SUGGESTION_CHIPS = ["Work", "Family", "Best Friends", "Workout Buddies", "College Friends", "Neighbors"];

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [existingGroupNames, setExistingGroupNames] = useState<string[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data: contacts } = await supabase.from("contacts").select("groups").limit(1000);
      const names = [...new Set((contacts || []).flatMap(c => c.groups || []))];
      setExistingGroupNames(names);
    };
    load();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [menuOpen]);

  const isHome = pathname === "/dashboard";
  const isGroups = pathname?.startsWith("/groups");
  const isEvents = pathname === "/events";
  const isPeople = pathname === "/contacts" || pathname?.startsWith("/contacts/");

  const availableChips = SUGGESTION_CHIPS.filter(chip =>
    !existingGroupNames.some(g => g.toLowerCase() === chip.toLowerCase())
  );
  const isDuplicate = newGroupName.trim() && existingGroupNames.some(g => g.toLowerCase() === newGroupName.trim().toLowerCase());

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-[#141210] border-t border-[#2E2924] flex items-center justify-around w-full max-w-full px-1 py-2 sm:px-4 sm:py-4 min-w-0">
        <button onClick={() => router.push("/dashboard")} className="flex flex-col items-center gap-0.5 min-w-0 flex-1 flex-shrink-0 basis-0">
          <span className={`text-base sm:text-lg ${isHome ? "text-[#C8A96E]" : "text-[#7A7068]"}`}>⌂</span>
          <span className={`text-[10px] sm:text-xs truncate max-w-full ${isHome ? "text-[#C8A96E]" : "text-[#7A7068]"}`}>Home</span>
        </button>
        <button onClick={() => router.push("/groups")} className="flex flex-col items-center gap-0.5 min-w-0 flex-1 flex-shrink-0 basis-0">
          <span className={`text-base sm:text-lg ${isGroups ? "text-[#C8A96E]" : "text-[#7A7068]"}`}>◉</span>
          <span className={`text-[10px] sm:text-xs truncate max-w-full ${isGroups ? "text-[#C8A96E]" : "text-[#7A7068]"}`}>Groups</span>
        </button>
        <div className="relative flex-shrink-0 flex items-center justify-center flex-1 basis-0 min-w-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="w-10 h-10 sm:w-12 sm:h-12 bg-[#C8A96E] rounded-full text-[#141210] text-xl sm:text-2xl font-light flex items-center justify-center shadow-lg hover:bg-[#D4B87E] transition-colors"
          >
            +
          </button>
          {menuOpen && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-[#1C1916] border border-[#2E2924] rounded-2xl shadow-lg overflow-hidden z-50">
              <button
                type="button"
                onClick={() => { setMenuOpen(false); router.push("/contacts/new"); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-[#F0E6D3] text-sm hover:bg-[#231F1B] transition-colors"
              >
                <span className="text-[#C8A96E] text-base">◎</span>
                Add friend
              </button>
              <button
                type="button"
                onClick={() => { setMenuOpen(false); router.push("/plan"); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-[#F0E6D3] te-sm hover:bg-[#231F1B] transition-colors"
              >
                <span className="text-[#C8A96E] text-base">◈</span>
                Plan event
              </button>
              <button
                type="button"
                onClick={() => { setMenuOpen(false); setShowCreateGroupModal(true); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-[#F0E6D3] text-sm hover:bg-[#231F1B] transition-colors"
              >
                <span className="text-[#C8A96E] text-base">◉</span>
                Create group
              </button>
            </div>
          )}
        </div>
        <button onClick={() => router.push("/events")} className="flex flex-col items-center gap-0.5 min-w-0 flex-1 flex-shrink-0 basis-0">
          <span className={`text-base sm:text-lg ${isEvents ? "text-[#C8A96E]" : "text-[#7A7068]"}`}>◈</span>
          <span className={`text-[10px] sm:text-xs truncate max-w-full ${isEvents ? "text-[#C8A96E]" : "text-[#7A7068]"}`}>Events</span>
        </button>
        <button onClick={() => router.push("/contacts")} className="flex flex-col items-center gap-0.5 min-w-0 flex-1 flex-shrink-0 basis-0">
          <span className={`text-base sm:text-lg ${isPeople ? "text-[#C8A96E]" : "text-[#7A7068]"}`}>◎</span>
          <span className={`text-[10px] sm:text-xs truncate max-w-full ${isPeople ? "text-[#C8A96E]" : "text-[#7A7068]"}`}>People</span>
        </button>
      </div>

      {showCreateGroupModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowCreateGroupModal(false); setNewGroupName(""); } }}
        >
          <div
            className="w-full max-w-sm bg-[#1C1916] border border-[#2E2924] rounded-2xl shadow-lg p-4"
            onClick={(e) => { e.stopPropagation(); }}
          >
            <div className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold mb-3">Create group</div>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="w-full bg-[#231F1B] border border-[#2E2924] rounded-xl px-4 py-3 text-sm text-[#F0E6D3] placeholder-[#7A7068] outline-none focus:border-[#C8A96E] transition-colors mb-3"
              autoFocus
            />
            {isDuplicate && (
              <p className="text-amber-200/90 text-sm mb-3">A group named {newGroupName.trim()} already exists</p>
            )}
            {!newGroupName && availableChips.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {availableChips.map(label => (
                    <button
                      key={label}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setNewGroupName(label); }}
                      className="px-2.5 py-1 rounded-full text-xs font-medium border border-[#2E2924] text-[#7A7068] hover:border-[#C8A96E44] hover:text-[#C8A96E] transition-colors"
                    >
                      {label}
                    </button>
                  ))}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowCreateGroupModal(false); setNewGroupName(""); }}
                className="flex-1 py-2 border border-[#2E2924] text-[#7A7068] rounded-lg text-sm hover:text-[#F0E6D3] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const name = newGroupName.trim();
                  if (!name) return;
                  setShowCreateGroupModal(false);
                  setNewGroupName("");
                  router.push("/groups/" + encodeURIComponent(name) + "?adding=1");
                }}
                disabled={!newGroupName.trim()}
                className="flex-1 py-2 bg-[#C8A96E] text-[#141210] rounded-lg text-sm font-semibold hover:bg-[#D4B87E] transition-colors disabled:opacity-60"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
