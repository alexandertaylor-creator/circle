"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

const SUGGESTION_CHIPS = ["Work", "Family", "Best Friends", "Workout Buddies", "College Friends", "Neighbors"];

type NavContact = {
  id: string;
  full_name: string;
  photo_url: string | null;
  groups: string[] | null;
};

const LOG_INTERACTION_TYPES = [
  { label: "Hung out", value: "hangout" as const },
  { label: "Called", value: "call" as const },
  { label: "Texted", value: "message" as const },
  { label: "Event", value: "event" as const },
] as const;

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [existingGroupNames, setExistingGroupNames] = useState<string[]>([]);
  const [showLogInteractionModal, setShowLogInteractionModal] = useState(false);
  const [logType, setLogType] = useState<"hangout" | "call" | "message" | "event" | null>(null);
  const [logDate, setLogDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [logNote, setLogNote] = useState("");
  const [logContacts, setLogContacts] = useState<NavContact[]>([]);
  const [logSearch, setLogSearch] = useState("");
  const [logSelectedIds, setLogSelectedIds] = useState<string[]>([]);
  const [logSaving, setLogSaving] = useState(false);
  const [logShowSuccess, setLogShowSuccess] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Load group names (for create-group suggestions) once on mount
  useEffect(() => {
    const load = async () => {
      const { data: contacts } = await supabase
        .from("contacts")
        .select("groups")
        .limit(1000);
      const names = [...new Set((contacts || []).flatMap((c: { groups?: string[] | null }) => c.groups || []))];
      setExistingGroupNames(names);
    };
    load();
  }, []);

  // Lazily load contacts for the Log interaction modal when it opens
  useEffect(() => {
    if (!showLogInteractionModal) return;
    if (logContacts.length > 0) return;
    const loadContacts = async () => {
      const { data } = await supabase
        .from("contacts")
        .select("id, full_name, groups, photo_url")
        .order("full_name")
        .limit(1000);
      setLogContacts((data || []) as NavContact[]);
    };
    loadContacts();
  }, [showLogInteractionModal, logContacts.length]);

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

  const filteredLogContacts = logContacts.filter(c => {
    if (!logSearch.trim()) return true;
    return c.full_name.toLowerCase().includes(logSearch.toLowerCase());
  });

  const toggleLogContact = (id: string) => {
    setLogSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleOpenLogInteraction = () => {
    setMenuOpen(false);
    setShowLogInteractionModal(true);
    setLogType("hangout");
    setLogDate(new Date().toISOString().split("T")[0]);
    setLogNote("");
    setLogSearch("");
    setLogSelectedIds([]);
    setLogShowSuccess(false);
  };

  const handleLogInteraction = async () => {
    if (!logType || logSelectedIds.length === 0) return;
    setLogSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLogSaving(false);
      return;
    }
    const occurredOn =
      logDate && logDate.trim()
        ? logDate
        : new Date().toISOString().split("T")[0];

    const rows = logSelectedIds.map(contactId => ({
      user_id: session.user.id,
      contact_id: contactId,
      type: logType,
      occurred_on: occurredOn,
      note: logNote.trim() || null,
    }));

    await supabase.from("interactions").insert(rows);
    await supabase
      .from("contacts")
      .update({ last_contacted: occurredOn })
      .in("id", logSelectedIds);

    setLogSaving(false);
    setLogShowSuccess(true);
    setTimeout(() => {
      setShowLogInteractionModal(false);
      setLogShowSuccess(false);
      setLogSelectedIds([]);
      setLogNote("");
      setLogSearch("");
      setLogType("hangout");
    }, 800);
  };

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
                onClick={handleOpenLogInteraction}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-[#F0E6D3] text-sm hover:bg-[#231F1B] transition-colors"
              >
                <span className="text-[#C8A96E] text-base">◎</span>
                Log interaction
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

      {showLogInteractionModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 flex items-end sm:items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowLogInteractionModal(false);
            }
          }}
        >
          <div
            className="w-full max-w-sm bg-[#1C1916] border border-[#2E2924] rounded-2xl shadow-lg p-4 max-h-[80vh] flex flex-col"
            onClick={(e) => { e.stopPropagation(); }}
          >
            <div className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold mb-3">
              Log interaction
            </div>

            <div className="mb-3">
              <div className="text-xs text-[#7A7068] mb-2 font-medium">Type</div>
              <div className="flex flex-wrap gap-2">
                {LOG_INTERACTION_TYPES.map(({ label, value }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setLogType(value)}
                    className={
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition-all " +
                      (logType === value
                        ? "border-[#C8A96E] text-[#C8A96E] bg-[#28211A]"
                        : "border-[#2E2924] text-[#7A7068] hover:border-[#C8A96E44] hover:text-[#C8A96E]")
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 mb-3">
              <div className="flex-1">
                <div className="text-xs text-[#7A7068] mb-1 font-medium">Date</div>
                <input
                  type="date"
                  value={logDate}
                  onChange={e => setLogDate(e.target.value)}
                  className="w-full bg-[#231F1B] border border-[#2E2924] rounded-lg px-3 py-2 text-sm text-[#F0E6D3] outline-none focus:border-[#C8A96E] transition-colors"
                />
              </div>
            </div>

            <div className="mb-3">
              <div className="text-xs text-[#7A7068] mb-1 font-medium">Note (optional)</div>
              <input
                type="text"
                placeholder="e.g. watched the Rockets game"
                value={logNote}
                onChange={e => setLogNote(e.target.value)}
                className="w-full bg-[#231F1B] border border-[#2E2924] rounded-lg px-3 py-2 text-sm text-[#F0E6D3] placeholder-[#7A7068] outline-none focus:border-[#C8A96E] transition-colors"
              />
            </div>

            <div className="mb-2">
              <div className="text-xs text-[#7A7068] mb-1 font-medium">People</div>
              <input
                type="text"
                placeholder="Search people"
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
                className="w-full bg-[#231F1B] border border-[#2E2924] rounded-lg px-3 py-2 text-sm text-[#F0E6D3] placeholder-[#7A7068] outline-none focus:border-[#C8A96E] transition-colors mb-2"
              />
              <div className="max-h-48 overflow-y-auto -mx-1 pr-1 space-y-1">
                {logContacts.length === 0 ? (
                  <div className="text-xs text-[#7A7068] px-1 py-2">
                    Loading people...
                  </div>
                ) : filteredLogContacts.length === 0 ? (
                  <div className="text-xs text-[#7A7068] px-1 py-2">
                    No people found.
                  </div>
                ) : (
                  filteredLogContacts.map(c => {
                    const selected = logSelectedIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleLogContact(c.id)}
                        className={
                          "w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-sm " +
                          (selected ? "bg-[#28211A]" : "bg-transparent hover:bg-[#1C1916]")
                        }
                      >
                        <span className="text-[#F0E6D3] truncate">{c.full_name}</span>
                        <span
                          className={
                            "ml-2 w-4 h-4 rounded-sm border flex items-center justify-center text-[10px] " +
                            (selected ? "border-[#C8A96E] bg-[#C8A96E] text-[#141210]" : "border-[#2E2924] text-[#7A7068]")
                          }
                        >
                          {selected ? "✓" : ""}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {logShowSuccess && (
              <div className="text-xs text-[#C8A96E] mb-2">
                Interaction logged.
              </div>
            )}

            <button
              type="button"
              onClick={handleLogInteraction}
              disabled={!logType || logSelectedIds.length === 0 || logSaving}
              className="mt-auto w-full py-3 bg-[#C8A96E] text-[#141210] rounded-xl font-semibold text-sm hover:bg-[#D4B87E] transition-colors disabled:bg-[#2E2924] disabled:text-[#7A7068]"
            >
              {logSaving ? "Logging..." : "Log it"}
            </button>
          </div>
        </div>
      )}

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
