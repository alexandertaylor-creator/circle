"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Contact = {
  id: string;
  full_name: string;
  last_contacted: string | null;
  fields: Record<string, string | boolean | string[] | null>;
};

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContacts = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/auth"); return; }
      const { data, error } = await supabase
        .from("contacts")
        .select("id, full_name, last_contacted, fields")
        .order("full_name");
      if (!error && data) setContacts(data);
      setLoading(false);
    };
    loadContacts();
  }, [router]);

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
    if (days < 30) return `${Math.floor(days/7)} week${Math.floor(days/7)>1?"s":""} ago`;
    return `${Math.floor(days/30)} month${Math.floor(days/30)>1?"s":""} ago`;
  };

  const filtered = contacts.filter(c => {
    const matchesSearch = c.full_name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "padel" ? c.fields["Plays padel"] === true : true;
    return matchesSearch && matchesFilter;
  });

  return (
    <main className="min-h-screen bg-[#141210] text-[#F0E6D3]">
      <header className="flex items-center justify-between px-6 py-5 border-b border-[#2E2924] sticky top-0 bg-[#141210] z-10">
        <span className="font-serif italic text-[#C8A96E] text-xl">circle</span>
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
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter(filter === "padel" ? null : "padel")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filter === "padel" ? "border-[#C8A96E] text-[#C8A96E] bg-[#28211A]" : "border-[#2E2924] text-[#7A7068]"}`}
          >
            Plays padel
          </button>
        </div>
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
                <div key={contact.id} className="bg-[#1C1916] border border-[#2E2924] rounded-2xl p-4 flex items-center gap-4 hover:border-[#C8A96E33] transition-all cursor-pointer">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ background: getColor(contact.full_name) }}>
                    {getInitials(contact.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[#F0E6D3] text-sm">{contact.full_name}</div>
                    <div className="text-xs text-[#7A7068] mt-0.5">Last seen {getLastSeen(contact.last_contacted)}</div>
                  </div>
                  {contact.fields["Plays padel"] && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#28211A] border border-[#C8A96E44] text-[#C8A96E]">padel</span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <button
        onClick={() => router.push("/contacts/new")}
        className="fixed bottom-8 right-8 w-14 h-14 bg-[#C8A96E] rounded-full text-[#141210] text-2xl font-light shadow-lg hover:bg-[#D4B87E] transition-colors flex items-center justify-center"
      >
        +
      </button>
    </main>
  );
}
