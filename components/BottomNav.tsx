"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

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

  const handleAddFriend = () => {
    setMenuOpen(false);
    router.push("/contacts/new");
  };
  const handlePlanEvent = () => {
    setMenuOpen(false);
    router.push("/plan");
  };
  const handleCreateGroup = () => {
    setMenuOpen(false);
    setShowCreateGroupModal(true);
  };
  const handleConfirmCreateGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    router.push(`/groups/${encodeURIComponent(name)}`);
    setShowCreateGroupModal(false);
    setNewGroupName("");
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-[#141210] border-t border-[#2E2924] flex items-center justify-around px-4 py-4">
        <button onClick={() => router.push("/dashboard")} className="flex flex-col items-center gap-1">
          <span className={`text-lg ${isHome ? "text-[#C8A96E]" : "text-[#7A7068]"}`}>⌂</span>
          <span className={`text-xs ${isHome ? "text-[#C8A96E]" : "text-[#7A7068]"}`}>Home</span>
        </button>
        <button onClick={() => router.push("/groups")} className="flex flex-col items-center gap-1">
          <span className={`text-lg ${isGroups ? "text-[#C8A96E]" : "text-[#7A7068]"}`}>◉</span>
          <span className={`text-xs ${isGroups ? "text-[#C8A96E]" : "text-[#7A7068]"}`}>Groups</span>
        </button>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="w-12 h-12 bg-[#C8A96E] rounded-full text-[#141210] text-2xl font-light flex items-center justify-center shadow-lg hover:bg-[#D4B87E] transition-colors"
          >
            +
          </button>
          {menuOpen && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-[#1C1916] border border-[#2E2924] rounded-2xl shadow-lg overflow-hidden z-50">
              <button
                type="button"
                onClick={handleAddFriend}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-[#F0E6D3] text-sm hover:bg-[#231F1B] transition-colors"
              >
                <span className="text-[#C8A96E] text-base">◎</span>
                Add friend
              </button>
              <button
                type="button"
                onClick={handlePlanEvent}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-[#F0E6D3] text-sm hover:bg-[#231F1B] transition-colors"
              >
                <span className="text-[#C8A96E] text-base">◈</span>
                Plan event
              </button>
              <button
                type="button"
                onClick={handleCreateGroup}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-[#F0E6D3] text-sm hover:bg-[#231F1B] transition-colors"
              >
                <span className="text-[#C8A96E] text-base">◉</span>
                Create group
              </button>
            </div>
          )}
        </div>
        <button onClick={() => router.push("/events")} className="flex flex-col items-center gap-1">
          <span className={`text-lg ${isEvents ? "text-[#C8A96E]" : "text-[#7A7068]"}`}>◈</span>
          <span className={`text-xs ${isEvents ? "text-[#C8A96E]" : "text-[#7A7068]"}`}>Events</span>
        </button>
        <button onClick={() => router.push("/contacts")} className="flex flex-col items-center gap-1">
          <span className={`text-lg ${isPeople ? "text-[#C8A96E]" : "text-[#7A7068]"}`}>◎</span>
          <span className={`text-xs ${isPeople ? "text-[#C8A96E]" : "text-[#7A7068]"}`}>People</span>
        </button>
      </div>

      {showCreateGroupModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
          onClick={() => {
            setShowCreateGroupModal(false);
            setNewGroupName("");
          }}
        >
          <div
            className="w-full max-w-sm bg-[#1C1916] border border-[#2E2924] rounded-2xl shadow-lg p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold mb-3">Create group</div>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group name"
              className="w-full bg-[#231F1B] border border-[#2E2924] rounded-xl px-4 py-3 text-sm text-[#F0E6D3] placeholder-[#7A7068] outline-none focus:border-[#C8A96E] transition-colors mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreateGroupModal(false);
                  setNewGroupName("");
                }}
                className="flex-1 py-2 border border-[#2E2924] text-[#7A7068] rounded-lg text-sm hover:text-[#F0E6D3] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCreateGroup}
                disabled={!newGroupName.trim()}
                className="flex-1 py-2 bg-[#C8A96E] text-[#141210] rounded-lg text-sm font-semibold hover:bg-[#D4B87E] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
