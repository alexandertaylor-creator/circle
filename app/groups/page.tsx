"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { BottomNav } from "@/components/BottomNav";

type GroupSummary = {
  name: string;
  count: number;
};

export default function GroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [groupPhotos, setGroupPhotos] = useState<Record<string, string>>({});
  const [sortBySize, setSortBySize] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/auth"); return; }
      const [{ data: contacts }, { data: profile }, { data: groupsRows }] = await Promise.all([
        supabase.from("contacts").select("full_name, groups").limit(1000),
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

  return (
    <main className="min-h-screen bg-[#141210] text-[#F0E6D3] pb-24">
      <header className="flex items-center justify-between px-6 py-5 border-b border-[#2E2924] sticky top-0 bg-[#141210] z-10">
        <button onClick={() => router.push("/dashboard")} className="font-serif italic text-[#C8A96E] text-xl">circle</button>
        <button onClick={() => setSortBySize(prev => !prev)} className="text-xs text-[#7A7068] hover:text-[#F0E6D3] transition-colors">
          {sortBySize ? "Sort A-Z" : "Sort by size"}
        </button>
        <button onClick={() => router.push("/profile")} className="w-8 h-8 rounded-full overflow-hidden bg-[#C8A96E] flex items-center justify-center">
          {userAvatar
            ? <img src={userAvatar} alt="" className="w-full h-full object-cover" />
            : <span className="text-[#141210] text-sm font-bold">A</span>
          }
        </button>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-3">
        {loading ? (
          <div className="text-center text-[#7A7068] text-sm py-12">Loading...</div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12">
            <div className="font-serif italic text-[#C8A96E] text-3xl mb-3">No groups yet.</div>
            <div className="text-[#7A7068] text-sm max-w-xs mx-auto">Add friends with group tags and they will appear here.</div>
          </div>
        ) : (
          sorted.map(group => (
            <button key={group.name}
              onClick={() => router.push("/groups/" + encodeURIComponent(group.name))}
              className="bg-[#1C1916] border border-[#2E2924] rounded-2xl p-4 text-left hover:border-[#C8A96E33] transition-all w-full flex items-center gap-3">
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
            </button>
          ))
        )}
      </div>
      <BottomNav />
    </main>
  );
}
