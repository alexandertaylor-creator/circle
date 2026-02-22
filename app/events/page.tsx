"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { BottomNav } from "@/components/BottomNav";

type Event = {
  id: string;
  name: string;
  event_date: string | null;
  event_time: string | null;
  contact_ids: string[] | null;
  message_draft: string | null;
  created_at: string;
};

type Contact = {
  id: string;
  full_name: string;
  photo_url: string | null;
};

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [userAvatarUrl, setUserAvatarUrl] = useState("");
  const [userDisplayName, setUserDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editContactIds, setEditContactIds] = useState<string[]>([]);
  const [addGuestSearch, setAddGuestSearch] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [addingGuestId, setAddingGuestId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/auth"); return; }
      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url, display_name")
        .eq("id", session.user.id)
        .single();
      if (profile?.avatar_url) setUserAvatarUrl(profile.avatar_url);
      if (profile?.display_name) setUserDisplayName(profile.display_name);
      const [{ data: events }, { data: contacts }] = await Promise.all([
        supabase.from("events").select("*").order("created_at", { ascending: false }),
        supabase.from("contacts").select("id, full_name, photo_url").limit(1000),
      ]);
      if (events) setEvents(events);
      if (contacts) setContacts(contacts);
      setLoading(false);
    };
    load();
  }, [router]);

  const getContact = (id: string) => contacts.find(c => c.id === id);

  const getInitials = (name: string) =>
    name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  const getColor = (name: string) => {
    const colors = ["#5A7E9E","#7E5A9E","#5A9E78","#9E7A5A","#9E5A6A","#6A9E5A","#5A8E9E","#9E905A"];
    return colors[name.charCodeAt(0) % colors.length];
  };

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const formatTime = (time: string | null) => {
    if (!time || !time.trim()) return null;
    const [h, m] = time.split(":").map(Number);
    const d = new Date(1970, 0, 1, h, m);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  const isUpcoming = (date: string | null) => {
    if (!date) return false;
    return new Date(date) >= new Date();
  };

  const upcoming = events.filter(e => isUpcoming(e.event_date));
  const past = events.filter(e => !isUpcoming(e.event_date));

  const repeatEvent = (event: Event) => {
    router.push(`/plan?name=${encodeURIComponent(event.name)}`);
  };

  const startEditing = (event: Event) => {
    setEditingEventId(event.id);
    setEditName(event.name);
    setEditDate(event.event_date || "");
    setEditTime(event.event_time || "");
    setEditContactIds(event.contact_ids || []);
  };

  const removeGuest = (contactId: string) => {
    setEditContactIds(prev => prev.filter(id => id !== contactId));
  };

  const addGuest = async (contactId: string) => {
    if (!editingEventId) return;
    const nextIds = [...editContactIds, contactId];
    setEditContactIds(nextIds);
    setAddingGuestId(contactId);
    await supabase.from("events").update({ contact_ids: nextIds }).eq("id", editingEventId);
    setEvents(prev => prev.map(e => e.id === editingEventId ? { ...e, contact_ids: nextIds } : e));
    setAddingGuestId(null);
  };

  const saveEdit = async () => {
    if (!editingEventId) return;
    setSavingEdit(true);
    await supabase.from("events").update({
      name: editName,
      event_date: editDate || null,
      event_time: editTime || null,
      contact_ids: editContactIds,
    }).eq("id", editingEventId);
    setEvents(prev => prev.map(e => e.id === editingEventId ? { ...e, name: editName, event_date: editDate || null, event_time: editTime || null, contact_ids: editContactIds } : e));
    setSavingEdit(false);
  };

  const deleteEvent = async (eventId: string) => {
    if (!window.confirm("Are you sure?")) return;
    setDeletingEventId(eventId);
    await supabase.from("events").delete().eq("id", eventId);
    setEvents(prev => prev.filter(e => e.id !== eventId));
    setExpanded(null);
    setEditingEventId(null);
    setDeletingEventId(null);
  };

  const EventCard = ({ event }: { event: Event }) => {
    const isOpen = expanded === event.id;
    const guestIds = event.contact_ids || [];
    const guests = guestIds.map(id => getContact(id)).filter(Boolean) as Contact[];

    return (
      <div className="bg-[#1C1916] border border-[#2E2924] rounded-2xl overflow-hidden">
        <button
          onClick={() => {
            if (isOpen) { setExpanded(null); setEditingEventId(null); setAddGuestSearch(""); }
            else { setExpanded(event.id); startEditing(event); }
          }}
          className="w-full p-4 text-left hover:bg-[#231F1B] transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="font-semibold text-[#F0E6D3] text-sm">{event.name}</div>
              <div className="text-xs text-[#7A7068] mt-0.5">
                {event.event_date ? formatDate(event.event_date) : new Date(event.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                {event.event_time ? ` at ${formatTime(event.event_time)}` : ""}
                {" · "}{guestIds.length} {guestIds.length === 1 ? "person" : "people"}
              </div>
            </div>
            <div className="flex -space-x-2 flex-shrink-0">
              {guests.slice(0, 4).map(c => (
                <div key={c.id} className="w-7 h-7 rounded-full border-2 border-[#1C1916] overflow-hidden flex-shrink-0"
                  style={{ background: getColor(c.full_name) }}>
                  {c.photo_url
                    ? <img src={c.photo_url} alt={c.full_name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">{getInitials(c.full_name)}</div>
                  }
                </div>
              ))}
              {guestIds.length > 4 && (
                <div className="w-7 h-7 rounded-full border-2 border-[#1C1916] bg-[#2E2924] flex items-center justify-center text-xs text-[#7A7068]">
                  +{guestIds.length - 4}
                </div>
              )}
            </div>
          </div>
        </button>

        {isOpen && editingEventId === event.id && (
          <div className="px-4 pb-4 border-t border-[#2E2924] pt-3 flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Event name"
                className="w-full bg-[#231F1B] border border-[#2E2924] rounded-lg px-3 py-2 text-sm text-[#F0E6D3] placeholder-[#7A7068] outline-none focus:border-[#C8A96E] transition-colors"
              />
              <input
                type="date"
                value={editDate}
                onChange={e => setEditDate(e.target.value)}
                className="w-full bg-[#231F1B] border border-[#2E2924] rounded-lg px-3 py-2 text-sm text-[#F0E6D3] outline-none focus:border-[#C8A96E] transition-colors"
              />
              <input
                type="time"
                value={editTime}
                onChange={e => setEditTime(e.target.value)}
                className="w-full bg-[#231F1B] border border-[#2E2924] rounded-lg px-3 py-2 text-sm text-[#F0E6D3] outline-none focus:border-[#C8A96E] transition-colors"
              />
            </div>

            <div>
              <div className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold mb-2">Guests</div>
              <div className="flex flex-col gap-1.5">
                {editContactIds.map(id => {
                  const c = getContact(id);
                  if (!c) return null;
                  return (
                    <div key={c.id} className="flex items-center justify-between gap-2 py-1">
                      <button onClick={() => router.push(`/contacts/${c.id}`)} className="flex items-center gap-2 hover:opacity-70 transition-opacity flex-1 min-w-0 text-left">
                        <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0" style={{ background: getColor(c.full_name) }}>
                          {c.photo_url ? <img src={c.photo_url} alt={c.full_name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">{getInitials(c.full_name)}</div>}
                        </div>
                        <span className="text-sm text-[#F0E6D3] truncate">{c.full_name}</span>
                      </button>
                      <button onClick={() => removeGuest(c.id)} className="text-xs px-2 py-1 rounded-full border border-red-900/50 text-red-400/80 hover:bg-red-900/20 transition-colors flex-shrink-0">
                        Remove
                      </button>
                    </div>
                  );
                })}
                {editContactIds.length === 0 && <div className="text-xs text-[#7A7068] py-2">No guests yet</div>}
              </div>
            </div>

            <div>
              <div className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold mb-2">Add people</div>
              <input
                type="text"
                value={addGuestSearch}
                onChange={e => setAddGuestSearch(e.target.value)}
                placeholder="Search contacts..."
                className="w-full bg-[#1C1916] border border-[#2E2924] rounded-xl px-4 py-3 text-sm text-[#F0E6D3] placeholder-[#7A7068] outline-none focus:border-[#C8A96E] transition-colors mb-3"
              />
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                {contacts
                  .filter(c => !editContactIds.includes(c.id) && c.full_name.toLowerCase().includes(addGuestSearch.toLowerCase().trim()))
                  .map(c => (
                    <div key={c.id} className="bg-[#1C1916] border border-[#2E2924] rounded-xl p-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ background: getColor(c.full_name) }}>
                        {c.photo_url ? <img src={c.photo_url} alt={c.full_name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white">{getInitials(c.full_name)}</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-[#F0E6D3] truncate">{c.full_name}</div>
                      </div>
                      <button
                        onClick={() => addGuest(c.id)}
                        disabled={addingGuestId === c.id}
                        className="px-3 py-1.5 rounded-lg border border-[#C8A96E33] text-[#C8A96E] text-xs font-medium hover:bg-[#C8A96E22] transition-colors disabled:opacity-60 flex-shrink-0"
                      >
                        {addingGuestId === c.id ? "Adding..." : "Add"}
                      </button>
                    </div>
                  ))}
                {addGuestSearch.trim() && contacts.filter(c => !editContactIds.includes(c.id) && c.full_name.toLowerCase().includes(addGuestSearch.toLowerCase().trim())).length === 0 && (
                  <div className="text-xs text-[#7A7068] py-2">No matching contacts</div>
                )}
              </div>
            </div>

            <button onClick={saveEdit} disabled={savingEdit || !editName.trim()}
              className="w-full py-3 bg-[#C8A96E] text-[#141210] rounded-xl font-semibold text-sm hover:bg-[#D4B87E] transition-colors disabled:opacity-60">
              {savingEdit ? "Saving..." : "Save changes"}
            </button>

            <button onClick={() => deleteEvent(event.id)} disabled={deletingEventId === event.id}
              className="w-full py-3 border border-red-900/50 text-red-400/80 rounded-xl text-sm font-medium hover:bg-red-900/20 transition-colors disabled:opacity-60">
              {deletingEventId === event.id ? "Deleting..." : "Delete event"}
            </button>

            <button onClick={() => repeatEvent(event)}
              className="w-full py-2 border border-[#2E2924] text-[#7A7068] rounded-lg text-xs hover:text-[#F0E6D3] transition-colors">
              Do this again
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-[#141210] text-[#F0E6D3] pb-24">
      <header className="flex items-center justify-between px-6 py-5 border-b border-[#2E2924] sticky top-0 bg-[#141210] z-10">
        <button onClick={() => router.push("/dashboard")} className="font-serif italic text-[#C8A96E] text-xl">circle</button>
        <span className="text-sm text-[#7A7068]">Events</span>
        <button onClick={() => router.push("/profile")} className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-[#C8A96E] text-[#141210] text-sm font-bold">
          {userAvatarUrl ? (
            <img src={userAvatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            (userDisplayName || "?")[0].toUpperCase()
          )}
        </button>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-6">
        {loading ? (
          <div className="text-center text-[#7A7068] text-sm py-12">Loading...</div>
        ) : (
          <>
            <button
              onClick={() => router.push("/plan")}
              className="w-full py-4 bg-[#C8A96E] text-[#141210] rounded-xl font-semibold text-sm hover:bg-[#D4B87E] transition-colors"
            >
              Plan something new
            </button>
            {events.length === 0 ? (
              <div className="text-center py-12">
                <div className="font-serif italic text-[#C8A96E] text-3xl mb-3">No events yet.</div>
                <div className="text-[#7A7068] text-sm max-w-xs mx-auto">Plan your first event and it will show up here.</div>
              </div>
            ) : (
              <>
                {upcoming.length > 0 && (
                  <div>
                    <div className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold mb-3">Upcoming</div>
                    <div className="flex flex-col gap-2">
                      {upcoming.map(e => <EventCard key={e.id} event={e} />)}
                    </div>
                  </div>
                )}
                {past.length > 0 && (
                  <div>
                    <div className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold mb-3">Past</div>
                    <div className="flex flex-col gap-2">
                      {past.map(e => <EventCard key={e.id} event={e} />)}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
