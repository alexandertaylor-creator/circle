"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { BottomNav } from "@/components/BottomNav";

type GroupSummary = {
  name: string;
  count: number;
};

const SUGGESTION_CHIPS = ["Work", "Family", "Best Friends", "Workout Buddies", "College Friends", "Neighbors"];

export default function GroupsPage() {
  const router = useRouter();
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [groupPhotos, setGroupPhotos] = useState<Record<string, string>>({});
  const [contacts, setContacts] = useState<{ id: string; groups: string[] | null }[]>([]);
  const [sortBySize, setSortBySize] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [deleteConfirmGroup, setDeleteConfirmGroup] = useState<string | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/auth"); return; }
      const [{ data: contacts }, { data: profile }, { data: groupsRows }] = await Promise.all([
        supabase.from("contacts").select("id, full_name, groups").limit(1000),
        supabase.from("profiles").select("avatar_url").eq("id", session.user.id).single(),
        supabase.from("groups").select("name, photo_url").eq("user_id", session.user.id),
      ]);
      if (profile) setUserAvatar(profile.avatar_url);
      if (groupsRows) {
        const photoMap: Record<string, string> = {};
        groupsRows.forEach((row: { name: string; photo_url: string | null }) => {
          if (row.photo_url) photoMap[row.name] = row.photo_url;
        });
        setGroupPhotos(photoMap);
      }
      if (contacts) {
        setContacts(contacts);
        const map: Record<string, number> = {};
        contacts.forEach(c => {
          (c.groups || []).forEach((g: string) => {
            map[g] = (map[g] || 0) + 1;
          });
        });
        const summaries = Object.entries(map).map(([name, count]) => ({ name, count }));
        setGroups(summaries);
      }
      setLoading(false);
    };
    load();
  }, [router]);

  const sorted = sortBySize
    ? [...groups].sort((a, b) => b.count - a.count)
    : [...groups].sort((a, b) => a.name.localeCompare(b.name));

  const existingGroupNames = groups.map(g => g.name);
  const availableChips = SUGGESTION_CHIPS.filter(chip =>
    !existingGroupNames.some(g => g.toLowerCase() === chip.toLowerCase())
  );
  const isDuplicate = newGroupName.trim() && existingGroupNames.some(g => g.toLowerCase() === newGroupName.trim().toLowerCase());

  const handleDeleteGroup = async (groupName: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setDeletingGroup(groupName);
    const contactsWithGroup = contacts.filter(c => (c.groups || []).includes(groupName));
    await Promise.all(
      contactsWithGroup.map(c => {
        const newGroups = (c.groups || []).filter(g => g !== groupName);
        return supabase.from("contacts").update({ groups: newGroups }).eq("id", c.id);
      })
    );
    await supabase.from("groups").delete().eq("user_id", session.user.id).eq("name", groupName);
    setGroups(prev => prev.filter(g => g.name !== groupName));
    setDeleteConfirmGroup(null);
    setDeletingGroup(null);
  };

  return (
    <main className="min-h-screen bg-[#141210] text-[#F0E6D3] pb-24">
      <header className="flex items-center justify-between px-6 py-5 border-b border-[#2E2924] sticky top-0 bg-[#141210] z-10">
        <button onClick={() => router.push("/dashboard")} className="font-serif italic text-[#C8A96E] text-xl">circle</button>
        <span className="text-sm text-[#7A7068]">Groups</span>
        <button onClick={() => router.push("/profile")} className="w-8 h-8 rounded-full overflow-hidden bg-[#C8A96E] flex items-center justify-center">
          {userAvatar
            ? <img src={userAvatar} alt="" className="w-full h-full object-cover" />
            : <span className="text-[#141210] text-sm font-bold">A</span>
          }
        </button>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-3">
        <div className="flex justify-end mb-1">
          <button onClick={() => setSortBySize(prev => !prev)} className="text-xs text-[#7A7068] hover:text-[#F0E6D3] transition-colors">
            {sortBySize ? "Sort A-Z" : "Sort by size"}
          </button>
        </div>
        <button
          onClick={() => setShowCreateGroupModal(true)}
          className="w-full mb-4 py-4 bg-[#C8A96E] text-[#141210] rounded-xl font-semibold text-sm hover:bg-[#D4B87E] transition-colors"
        >
          Create a group
        </button>

        {loading ? (
          <div className="text-center text-[#7A7068] text-sm py-12">Loading...</div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12">
            <div className="font-serif italic text-[#C8A96E] text-3xl mb-3">No groups yet.</div>
            <div className="text-[#7A7068] text-sm max-w-xs mx-auto">Add friends with group tags and they will appear here.</div>
          </div>
        ) : (
          sorted.map(group => (
            <div key={group.name} className="bg-[#1C1916] border border-[#2E2924] rounded-2xl overflow-hidden hover:border-[#C8A96E33] transition-all">
              {deleteConfirmGroup === group.name ? (
                <div className="p-4 flex flex-col gap-3">
                  <p className="text-sm text-[#F0E6D3]">Delete {group.name}?</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmGroup(null)}
                      className="flex-1 py-2 border border-[#2E2924] text-[#7A7068] rounded-lg text-sm hover:text-[#F0E6D3] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteGroup(group.name)}
                      disabled={!!deletingGroup}
                      className="flex-1 py-2 bg-red-900/60 text-red-200 rounded-lg text-sm font-semibold hover:bg-red-900/80 transition-colors disabled:opacity-60"
                    >
                      {deletingGroup === group.name ? "Deleting..." : "Confirm"}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => router.push("/groups/" + encodeURIComponent(group.name))}
                  className="p-4 flex items-center gap-3 cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-[#28211A] text-[#C8A96E] text-lg font-semibold">
                    {groupPhotos[group.name] ? (
                      <img src={groupPhotos[group.name]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      group.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="font-semibold text-[#F0E6D3] capitalize text-base truncate">{group.name}</div>
                  </div>
                  <div className="text-xs text-[#7A7068] flex-shrink-0">{group.count} {group.count === 1 ? "person" : "people"}</div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); if (!deletingGroup) setDeleteConfirmGroup(group.name); }}
                    disabled={!!deletingGroup}
                    className="flex-shrink-0 p-1.5 rounded-lg text-red-400/90 hover:bg-red-900/20 hover:text-red-300 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                    aria-label="Delete group"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
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

      <BottomNav />
    </main>
  );
}
