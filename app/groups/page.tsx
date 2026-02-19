"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type GroupSummary = {
  name: string;
  count: number;
  members: { full_name: string }[];
};

export default function GroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/auth"); return; }
      const { data } = await supabase
        .from("contacts")
        .select("full_name, groups");
      if (data) {
        const map: Record<string, { full_name: string }[]> = {};
        data.forEach(c => {
          (c.groups || []).forEach((g: string) => {
            if (!map[g]) map[g] = [];
            map[g].push({ full_name: c.full_name });
          });
        });
        const summaries = Object.entries(map).map(([name, members]) => ({
          name, count: members.length, members: members.slice(0, 3)
        }));
        setGroups(summaries.sort((a, b) => a.name.localeCompare(b.name)));
      }
      setLoading(false);
    };
    load();
  }, [router]);

  const getInitials = (name: string) =>
    name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  const getColor = (name: string) => {
    const colors = ["#5A7E9E","#7E5A9E","#5A9E78","#9E7A5A","#9E5A6A","#6A9E5A","#5A8E9E","#9E905A"];
    return colors[name.charCodeAt(0) % colors.length];
  };

  return (
    <main className="min-h-screen bg-[#141210] text-[#F0E6D3] pb-24">
      <header className="flex items-center justify-between px-6 py-5 border-b border-[#2E2924] sticky top-0 bg-[#141210] z-10">
        <button onClick={() => router.push("/dashboard")} className="font-serif italic text-[#C8A96E] text-xl">circle</button>
        <span className="text-sm text-[#7A7068]">Groups</span>
        <div className="w-10" />
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
          groups.map(group => (
            <button key={group.name}
              onClick={() => router.push(`/groups/${encodeURIComponent(group.name)}`)}
              className="bg-[#1C1916] border border-[#2E2924] rounded-2xl p-4 text-left hover:border-[#C8A96E33] transition-all w-full">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-[#F0E6D3] capitalize text-base">{group.name}</div>
                <div className="text-xs text-[#7A7068]">{group.count} {group.count === 1 ? "person" : "people"}</div>
              </div>
              <div className="flex gap-1.5">
                {group.members.map(m => (
                  <div key={m.full_name}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: getColor(m.full_name) }}>
                    {getInitials(m.full_name)}
                  </div>
                ))}
                {group.count > 3 && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs text-[#7A7068] bg-[#2E2924]">
                    +{group.count - 3}
                  </div>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-[#141210] border-t border-[#2E2924] flex items-center justify-around px-6 py-4">
        <button onClick={() => router.push("/dashboard")} className="flex flex-col items-center gap-1">
          <span className="text-[#7A7068] text-lg">⌂</span>
          <span className="text-xs text-[#7A7068]">Home</span>
        </button>
        <button onClick={() => router.push("/groups")} className="flex flex-col items-center gap-1">
          <span className="text-[#C8A96E] text-lg">◉</span>
          <span className="text-xs text-[#C8A96E]">Groups</span>
        </button>
        <button onClick={() => router.push("/contacts/new")}
          className="w-12 h-12 bg-[#C8A96E] rounded-full text-[#141210] text-2xl font-light flex items-center justify-center shadow-lg">
          +
        </button>
        <button onClick={() => router.push("/contacts")} className="flex flex-col items-center gap-1">
          <span className="text-[#7A7068] text-lg">◎</span>
          <span className="text-xs text-[#7A7068]">People</span>
        </button>
      </div>
    </main>
  );
}
