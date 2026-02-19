"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Contact = {
  id: string;
  full_name: string;
  last_contacted: string | null;
  groups: string[] | null;
  interests: string[] | null;
};

export default function GroupDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = React.use(params);
  const groupName = decodeURIComponent(name);
  const router = useRouter();
  const [members, setMembers] = useState<Contact[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/auth"); return; }
      const { data } = await supabase
        .from("contacts")
        .select("id, full_name, last_contacted, groups, interests")
        .order("full_name");
      if (data) {
        setAllContacts(data);
        setMembers(data.filter(c => (c.groups || []).includes(groupName)));
      }
      setLoading(false);
    };
    load();
  }, [groupName, router]);

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
    if (days < 30) return `${Math.floor(days/7)}w ago`;
    return `${Math.floor(days/30)}mo ago`;
  };

  const removeMember = async (contact: Contact) => {
    const newGroups = (contact.groups || []).filter(g => g !== groupName);
    await supabase.from("contacts").update({ groups: newGroups }).eq("id", contact.id);
    setMembers(prev => prev.filter(m => m.id !== contact.id));
    setAllContacts(prev => prev.map(c => c.id === contact.id ? { ...c, groups: newGroups } : c));
  };

  const addMember = async (contact: Contact) => {
    const newGroups = [...(contact.groups || []), groupName];
    await supabase.from("contacts").update({ groups: newGroups }).eq("id", contact.id);
    setMembers(prev => [...prev, { ...contact, groups: newGroups }]);
    setAllContacts(prev => prev.map(c => c.id === contact.id ? { ...c, groups: newGroups } : c));
    setSearch("");
  };

  const nonMembers = allContacts.filter(c =>
    !(c.groups || []).includes(groupName) &&
    c.full_name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <main className="min-h-screen bg-[#141210] flex items-center justify-center">
      <div className="font-serif italic text-[#C8A96E] text-2xl">circle</div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#141210] text-[#F0E6D3] pb-24">
      <header className="flex items-center justify-between px-6 py-5 border-b border-[#2E2924] sticky top-0 bg-[#141210] z-10">
        <button onClick={() => router.push("/groups")} className="text-sm text-[#7A7068] hover:text-[#F0E6D3] transition-colors">
          Back
        </button>
        <span className="font-serif italic text-[#C8A96E] text-lg capitalize">{groupName}</span>
        <button onClick={() => setAdding(!adding)} className="text-sm text-[#C8A96E] hover:text-[#D4B87E] transition-colors">
          {adding ? "Done" : "Edit"}
        </button>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">

        <div className="flex items-center justify-between">
          <div className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold">
            {members.length} {members.length === 1 ? "person" : "people"}
          </div>
          <button onClick={() => router.push(`/contacts?group=${encodeURIComponent(groupName)}`)}
            className="text-xs text-[#C8A96E] hover:text-[#D4B87E] transition-colors">
            Plan something
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {members.map(contact => (
            <div key={contact.id}
              className="bg-[#1C1916] border border-[#2E2924] rounded-2xl p-4 flex items-center gap-3 hover:border-[#C8A96E33] transition-all">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ background: getColor(contact.full_name) }}
                onClick={() => router.push(`/contacts/${contact.id}`)}>
                {getInitials(contact.full_name)}
              </div>
              <div className="flex-1 cursor-pointer" onClick={() => router.push(`/contacts/${contact.id}`)}>
                <div className="font-medium text-sm text-[#F0E6D3]">{contact.full_name}</div>
                <div className="text-xs text-[#7A7068]">Last seen {getLastSeen(contact.last_contacted)}</div>
              </div>
              {adding && (
                <button onClick={() => removeMember(contact)}
                  className="text-xs px-2 py-1 rounded-full border border-red-900 text-red-400 hover:bg-red-900 hover:bg-opacity-20 transition-colors">
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        {adding && (
          <div className="mt-2">
            <div className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold mb-3">Add people</div>
            <input
              type="text"
              placeholder="Search your contacts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#1C1916] border border-[#2E2924] rounded-xl px-4 py-3 text-sm text-[#F0E6D3] placeholder-[#7A7068] outline-none focus:border-[#C8A96E] transition-colors mb-3"
            />
            <div className="flex flex-col gap-2">
              {nonMembers.slice(0, 8).map(contact => (
                <div key={contact.id}
                  className="bg-[#1C1916] border border-[#2E2924] rounded-2xl p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: getColor(contact.full_name) }}>
                    {getInitials(contact.full_name)}
                  </div>
                  <div className="flex-1 text-sm text-[#F0E6D3]">{contact.full_name}</div>
                  <button onClick={() => addMember(contact)}
                    className="text-xs px-2 py-1 rounded-full border border-[#C8A96E33] text-[#C8A96E] hover:bg-[#28211A] transition-colors">
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>
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
