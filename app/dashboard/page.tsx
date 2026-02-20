"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { BottomNav } from "@/components/BottomNav";

type Contact = {
  id: string;
  full_name: string;
  last_contacted: string | null;
  interests: string[] | null;
  groups: string[] | null;
  photo_url: string | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [allInterests, setAllInterests] = useState<string[]>([]);
  const [allGroups, setAllGroups] = useState<string[]>([]);
  const [userName, setUserName] = useState("");
  const [userAvatarUrl, setUserAvatarUrl] = useState("");
  const [topFriends, setTopFriends] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/auth"); return; }
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", session.user.id)
        .single();
      setUserName(profile?.display_name ?? session.user.email?.split("@")[0] ?? "friend");
      if (profile?.avatar_url) setUserAvatarUrl(profile.avatar_url);
      const { data } = await supabase
        .from("contacts")
        .select("id, full_name, last_contacted, interests, groups, photo_url")
        .order("full_name")
        .limit(1000);
      const { data: interactions } = await supabase
        .from("interactions")
        .select("contact_id")
        .limit(10000);
      if (data) {
        setContacts(data);
        setAllInterests(Array.from(new Set(data.flatMap(c => c.interests || []))).sort());
        setAllGroups(Array.from(new Set(data.flatMap(c => c.groups || []))).sort());
        const countByContact = (interactions || []).reduce((acc, r) => {
          acc[r.contact_id] = (acc[r.contact_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const topIds = Object.entries(countByContact)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([id]) => id);
        setTopFriends(topIds.map(id => data.find(c => c.id === id)).filter(Boolean) as Contact[]);
      }
      setLoading(false);
    };
    load();
  }, [router]);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const getInitials = (name: string) =>
    name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  const getColor = (name: string) => {
    const colors = ["#5A7E9E","#7E5A9E","#5A9E78","#9E7A5A","#9E5A6A","#6A9E5A","#5A8E9E","#9E905A"];
    return colors[name.charCodeAt(0) % colors.length];
  };

  const getDaysSince = (date: string | null) => {
    if (!date) return 999;
    return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  };

  const getLastSeen = (date: string | null) => {
    const days = getDaysSince(date);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days/7)}w ago`;
    return `${Math.floor(days/30)}mo ago`;
  };

  const needsAttention = contacts
    .filter(c => getDaysSince(c.last_contacted) > 21)
    .sort((a, b) => getDaysSince(b.last_contacted) - getDaysSince(a.last_contacted))
    .slice(0, 3);

  if (loading) return (
    <main className="min-h-screen bg-[#141210] flex items-center justify-center">
      <div className="font-serif italic text-[#C8A96E] text-2xl">circle</div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#141210] text-[#F0E6D3] pb-24">
      <header className="flex items-center justify-between px-6 py-5 border-b border-[#2E2924] sticky top-0 bg-[#141210] z-10">
        <button onClick={() => router.push("/dashboard")} className="font-serif italic text-[#C8A96E] text-xl">circle</button>
        <button onClick={() => router.push("/profile")} className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-[#C8A96E] text-[#141210] text-sm font-bold">
          {userAvatarUrl ? (
            <img src={userAvatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            userName[0]?.toUpperCase()
          )}
        </button>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-8">

        <div>
          <div className="text-[#7A7068] text-sm mb-1">{getGreeting()}, {userName}.</div>
          <div className="font-serif text-3xl text-[#F0E6D3]">
            {contacts.length === 0 ? "Welcome to circle." : `Your circle has ${contacts.length} ${contacts.length === 1 ? "person" : "people"}.`}
          </div>
        </div>

        {needsAttention.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold">Reconnect</div>
              <button onClick={() => router.push("/contacts")} className="text-xs text-[#C8A96E]">See all</button>
            </div>
            <div className="flex flex-col gap-2">
              {needsAttention.map(contact => (
                <div key={contact.id} onClick={() => router.push(`/contacts/${contact.id}`)} className="bg-[#1C1916] border border-[#2E2924] rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:border-[#C8A96E33] transition-all">
                  {contact.photo_url ? (
                    <img src={contact.photo_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ background: getColor(contact.full_name) }}>
                      {getInitials(contact.full_name)}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-sm text-[#F0E6D3]">{contact.full_name}</div>
                    <div className="text-xs text-[#7A7068]">Last seen {getLastSeen(contact.last_contacted)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={() => router.push("/plan")}
          className="w-full bg-[#C8A96E] text-[#141210] rounded-2xl p-5 text-left hover:bg-[#D4B87E] transition-colors">
          <div className="text-xl mb-1">◈</div>
          <div className="font-semibold text-base">Plan something</div>
          <div className="text-sm opacity-70 mt-0.5">Filter your people and build the perfect guest list.</div>
        </button>

        {allGroups.length > 0 && (
          <div>
            <div className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold mb-3">Groups</div>
            <div className="grid grid-cols-2 gap-2">
              {allGroups.map(group => {
                const count = contacts.filter(c => (c.groups || []).includes(group)).length;
                return (
                  <button key={group} onClick={() => router.push(`/groups/${encodeURIComponent(group)}`)}
                    className="bg-[#1C1916] border border-[#2E2924] rounded-2xl p-4 text-left hover:border-[#C8A96E33] transition-all">
                    <div className="font-medium text-sm text-[#F0E6D3] capitalize mb-1">{group}</div>
                    <div className="text-xs text-[#7A7068]">{count} {count === 1 ? "person" : "people"}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {allInterests.length > 0 && (
          <div>
            <div className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold mb-3">Interests</div>
            <div className="flex flex-wrap gap-2">
              {allInterests.map(interest => {
                const count = contacts.filter(c => (c.interests || []).includes(interest)).length;
                return (
                  <button key={interest} onClick={() => router.push(`/contacts?interest=${encodeURIComponent(interest)}`)}
                    className="bg-[#1C1916] border border-[#2E2924] rounded-2xl px-4 py-3 hover:border-[#C8A96E33] transition-all flex items-center gap-2">
                    <span className="text-sm text-[#F0E6D3] capitalize">{interest}</span>
                    <span className="text-xs text-[#7A7068]">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {topFriends.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold">Top friends</div>
              <button onClick={() => router.push("/contacts")} className="text-xs text-[#C8A96E]">See all</button>
            </div>
            <div className="flex flex-col gap-2">
              {topFriends.map(contact => (
                <div key={contact.id} onClick={() => router.push(`/contacts/${contact.id}`)} className="bg-[#1C1916] border border-[#2E2924] rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:border-[#C8A96E33] transition-all">
                  {contact.photo_url ? (
                    <img src={contact.photo_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ background: getColor(contact.full_name) }}>
                      {getInitials(contact.full_name)}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-sm text-[#F0E6D3]">{contact.full_name}</div>
                    {contact.groups && contact.groups.length > 0 && (
                      <div className="text-xs text-[#7A7068] capitalize">{contact.groups.join(", ")}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {contacts.length === 0 && (
          <div className="text-center py-12">
            <div className="font-serif italic text-[#C8A96E] text-4xl mb-4">Start here.</div>
            <div className="text-[#7A7068] text-sm mb-6 max-w-xs mx-auto">Add your first friend and circle will start showing you who to reach out to and when.</div>
            <button onClick={() => router.push("/contacts/new")}
              className="px-6 py-3 bg-[#C8A96E] text-[#141210] rounded-xl font-semibold text-sm hover:bg-[#D4B87E] transition-colors">
              Add your first friend
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
