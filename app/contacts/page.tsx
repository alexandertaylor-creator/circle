"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Contact = {
  id: string;
  full_name: string;
  last_contacted: string | null;
  interests: string[] | null;
  groups: string[] | null;
  photo_url: string | null;
};

type FilterChip = {
  label: string;
  kind: "interest" | "group";
};

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [allInterests, setAllInterests] = useState<string[]>([]);
  const [allGroups, setAllGroups] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<FilterChip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/auth"); return; }
      const { data } = await supabase
        .from("contacts")
        .select("id, full_name, last_contacted, interests, groups, photo_url")
        .order("full_name");
      if (data) {
        setContacts(data);
        setAllInterests(Array.from(new Set(data.flatMap(c => c.interests || []))).sort());
        setAllGroups(Array.from(new Set(data.flatMap(c => c.groups || []))).sort());
      }
      setLoading(false);
    };
    load();
  }, [router]);

  const isActive = (chip: FilterChip) =>
    activeFilters.some(f => f.kind === chip.kind && f.label === chip.label);

  const toggleFilter = (chip: FilterChip) => {
    if (isActive(chip)) {
      setActiveFilters(prev => prev.filter(f => !(f.kind === chip.kind && f.label === chip.label)));
    } else {
      setActiveFilters(prev => [...prev, chip]);
    }
  };

  const matchesFilters = (contact: Contact) => {
    if (activeFilters.length === 0) return true;
    return activeFilters.every(filter => {
      if (filter.kind === "interest") return (contact.interests || []).includes(filter.label);
      return (contact.groups || []).includes(filter.label);
    });
  };

  const filtered = contacts.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) && matchesFilters(c)
  );

  const getInitials = (name: string) =>
    name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  const getColor = (name: string) => {
    const colors = ["#5A7E9E","#7E5A9E","#5A9E78","#9E7A5A","#9E5A6A","#6A9E5A","#5A8E9E","#9E905A"];
    return colors[name.charCodeAt(0) % colors.length];
  };

  const getLastSeen = (date: string | null) => {
    if (!date) return "Never";
    const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? "s" : ""} ago`;
    return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? "s" : ""} ago`;
  };

  return (
    <main className="min-h-screen bg-[#141210] text-[#F0E6D3] pb-24">
      <header className="flex items-center justify-between px-6 py-5 border-b border-[#2E2924] sticky top-0 bg-[#141210] z-10">
        <button onClick={() => router.push("/dashboard")} className="font-serif italic text-[#C8A96E] text-xl">circle</button>
        <button className="w-8 h-8 rounded-full bg-[#C8A96E] text-[#141210] text-sm font-bold flex items-center justify-center">
          A
        </button>
      </header>
      <div className="max-w-lg mx-auto px-4 py-6">
        <input
          type="text"
          placeholder="Search your people..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#1C1916] border border-[#2E2924] rounded-xl px-4 py-3 text-sm text-[#F0E6D3] placeholder-[#7A7068] outline-none focus:border-[#C8A96E] transition-colors mb-4"
        />

        {allInterests.length > 0 && (
          <div className="mb-3">
            <div className="text-xs text-[#7A7068] uppercase tracking-widest mb-2 font-semibold">Interests</div>
            <div className="flex flex-wrap gap-2">
              {allInterests.map(tag => (
                <button key={tag} onClick={() => toggleFilter({ label: tag, kind: "interest" })}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${isActive({ label: tag, kind: "interest" }) ? "border-[#C8A96E] text-[#C8A96E] bg-[#28211A]" : "border-[#2E2924] text-[#7A7068]"}`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {allGroups.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-[#7A7068] uppercase tracking-widest mb-2 font-semibold">Groups</div>
            <div className="flex flex-wrap gap-2">
              {allGroups.map(tag => (
                <button key={tag} onClick={() => toggleFilter({ label: tag, kind: "group" })}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${isActive({ label: tag, kind: "group" }) ? "border-[#C8A96E] text-[#C8A96E] bg-[#28211A]" : "border-[#2E2924] text-[#7A7068]"}`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeFilters.length > 0 && (
          <button onClick={() => setActiveFilters([])} className="text-xs text-[#7A7068] hover:text-[#F0E6D3] transition-colors mb-4 block">
            Clear all filters
          </button>
        )}

        {loading ? (
          <div className="text-center text-[#7A7068] text-sm py-12">Loading your people...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-[#7A7068] text-sm py-12">
            {contacts.length === 0 ? "No friends yet — add your first one!" : "No matches found."}
          </div>
        ) : (
          <>
            <div className="text-xs text-[#7A7068] mb-4 uppercase tracking-widest font-semibold">
              {filtered.length} {filtered.length === 1 ? "person" : "people"}
            </div>
            <div className="flex flex-col gap-3">
              {filtered.map(contact => (
                <div key={contact.id} onClick={() => router.push(`/contacts/${contact.id}`)} className="bg-[#1C1916] border border-[#2E2924] rounded-2xl p-4 flex items-center gap-4 hover:border-[#C8A96E33] transition-all cursor-pointer">
                  {contact.photo_url ? (
                    <img src={contact.photo_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ background: getColor(contact.full_name) }}>
                      {getInitials(contact.full_name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[#F0E6D3] text-sm">{contact.full_name}</div>
                    <div className="text-xs text-[#7A7068] mt-0.5">Last seen {getLastSeen(contact.last_contacted)}</div>
                    {contact.groups && contact.groups.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {contact.groups.map(g => (
                          <span key={g} className="text-xs px-2 py-0.5 rounded-full bg-[#28211A] border border-[#C8A96E33] text-[#C8A96E88]">
                            {g}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-[#141210] border-t border-[#2E2924] flex items-center justify-around px-6 py-4">
        <button onClick={() => router.push("/dashboard")} className="flex flex-col items-center gap-1">
          <span className="text-[#7A7068] text-lg">⌂</span>
          <span className="text-xs text-[#7A7068]">Home</span>
        </button>
        <button onClick={() => router.push("/groups")} className="flex flex-col items-center gap-1">
          <span className="text-[#7A7068] text-lg">◉</span>
          <span className="text-xs text-[#7A7068]">Groups</span>
        </button>
        <button onClick={() => router.push("/contacts/new")}
          className="w-12 h-12 bg-[#C8A96E] rounded-full text-[#141210] text-2xl font-light flex items-center justify-center shadow-lg hover:bg-[#D4B87E] transition-colors">
          +
        </button>
        <button onClick={() => router.push("/contacts")} className="flex flex-col items-center gap-1">
          <span className="text-[#C8A96E] text-lg">◎</span>
          <span className="text-xs text-[#C8A96E]">People</span>
        </button>
      </div>
    </main>
  );
}
