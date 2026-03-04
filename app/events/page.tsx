"use client";
import { useState, useEffect, useMemo, useCallback, memo } from "react";
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
  photo_url: string | null;
};

type Contact = {
  id: string;
  full_name: string;
  photo_url: string | null;
};

type Interaction = {
  id: string;
  contact_id: string;
  type: string;
  occurred_on: string;
  note: string | null;
};

type EventEditPayload = {
  name: string;
  date: string;
  time: string;
  contactIds: string[];
};

function getColor(name: string) {
  const colors = ["#5A7E9E","#7E5A9E","#5A9E78","#9E7A5A","#9E5A6A","#6A9E5A","#5A8E9E","#9E905A"];
  return colors[name.charCodeAt(0) % colors.length];
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

const EventCard = memo(function EventCard({
  event,
  isOpen,
  isEditing,
  onToggle,
  onSaveEdit,
  onDelete,
  onRepeat,
  contacts,
  formatDate,
  formatTime,
  router,
  savingEdit,
  deletingEventId,
}: {
  event: Event;
  isOpen: boolean;
  isEditing: boolean;
  onToggle: (event: Event) => void;
  onSaveEdit: (eventId: string, payload: EventEditPayload) => void;
  onDelete: (eventId: string) => void;
  onRepeat: (event: Event) => void;
  contacts: Contact[];
  formatDate: (date: string | null) => string | null;
  formatTime: (time: string | null) => string | null;
  router: ReturnType<typeof useRouter>;
  savingEdit: boolean;
  deletingEventId: string | null;
}) {
  const [localEditName, setLocalEditName] = useState("");
  const [localEditDate, setLocalEditDate] = useState("");
  const [localEditTime, setLocalEditTime] = useState("");
  const [localEditContactIds, setLocalEditContactIds] = useState<string[]>([]);
  const [localAddGuestSearch, setLocalAddGuestSearch] = useState("");

  const getContact = useCallback((id: string) => contacts.find(c => c.id === id), [contacts]);

  useEffect(() => {
    if (isEditing && event) {
      setLocalEditName(event.name);
      setLocalEditDate(event.event_date || "");
      setLocalEditTime(event.event_time || "");
      setLocalEditContactIds(event.contact_ids || []);
      setLocalAddGuestSearch("");
    }
  }, [isEditing, event?.id, event?.name, event?.event_date, event?.event_time, event?.contact_ids]);

  const guestIds = event.contact_ids || [];
  const guests = guestIds.map(id => getContact(id)).filter(Boolean) as Contact[];

  const handleRemoveGuest = useCallback((contactId: string) => {
    setLocalEditContactIds(prev => prev.filter(id => id !== contactId));
  }, []);

  const handleAddGuest = useCallback((contactId: string) => {
    setLocalEditContactIds(prev => [...prev, contactId]);
  }, []);

  const handleSave = useCallback(() => {
    onSaveEdit(event.id, {
      name: localEditName,
      date: localEditDate,
      time: localEditTime,
      contactIds: localEditContactIds,
    });
  }, [event.id, localEditName, localEditDate, localEditTime, localEditContactIds, onSaveEdit]);

  return (
    <div className="bg-[#1C1916] border border-[#2E2924] rounded-2xl overflow-hidden">
      <button
        onClick={() => onToggle(event)}
        className="w-full p-4 text-left hover:bg-[#231F1B] transition-colors"
      >
        <div className="flex items-start gap-3">
          {event.photo_url && (
            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-[#2E2924]">
              <img src={event.photo_url} alt={event.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="font-semibold text-[#F0E6D3] text-sm">{event.name}</div>
              <div className="text-xs text-[#7A7068] mt-0.5">
                {event.event_date
                  ? formatDate(event.event_date)
                  : new Date(event.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                {event.event_time ? ` at ${formatTime(event.event_time)}` : ""}
                {" · "}
                {guestIds.length} {guestIds.length === 1 ? "person" : "people"}
              </div>
            </div>
            <div className="flex -space-x-2 flex-shrink-0">
              {guests.slice(0, 4).map(c => (
                <div
                  key={c.id}
                  className="w-7 h-7 rounded-full border-2 border-[#1C1916] overflow-hidden flex-shrink-0"
                  style={{ background: getColor(c.full_name) }}
                >
                  {c.photo_url ? (
                    <img src={c.photo_url} alt={c.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                      {getInitials(c.full_name)}
                    </div>
                  )}
                </div>
              ))}
              {guestIds.length > 4 && (
                <div className="w-7 h-7 rounded-full border-2 border-[#1C1916] bg-[#2E2924] flex items-center justify-center text-xs text-[#7A7068]">
                  +{guestIds.length - 4}
                </div>
              )}
            </div>
          </div>
        </div>
      </button>

      {isOpen && isEditing && (
        <div className="px-4 pb-4 border-t border-[#2E2924] pt-3 flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={localEditName}
              onChange={e => setLocalEditName(e.target.value)}
              placeholder="Event name"
              className="w-full bg-[#231F1B] border border-[#2E2924] rounded-lg px-3 py-2 text-sm text-[#F0E6D3] placeholder-[#7A7068] outline-none focus:border-[#C8A96E] transition-colors"
            />
            <input
              type="date"
              value={localEditDate}
              onChange={e => setLocalEditDate(e.target.value)}
              className="w-full bg-[#231F1B] border border-[#2E2924] rounded-lg px-3 py-2 text-sm text-[#F0E6D3] outline-none focus:border-[#C8A96E] transition-colors"
            />
            <input
              type="time"
              value={localEditTime}
              onChange={e => setLocalEditTime(e.target.value)}
              className="w-full bg-[#231F1B] border border-[#2E2924] rounded-lg px-3 py-2 text-sm text-[#F0E6D3] outline-none focus:border-[#C8A96E] transition-colors"
            />
          </div>

          <div>
            <div className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold mb-2">Guests</div>
            <div className="flex flex-col gap-1.5">
              {localEditContactIds.map(id => {
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
                    <button onClick={() => handleRemoveGuest(c.id)} className="text-xs px-2 py-1 rounded-full border border-red-900/50 text-red-400/80 hover:bg-red-900/20 transition-colors flex-shrink-0">
                      Remove
                    </button>
                  </div>
                );
              })}
              {localEditContactIds.length === 0 && <div className="text-xs text-[#7A7068] py-2">No guests yet</div>}
            </div>
          </div>

          <div>
            <div className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold mb-2">Add people</div>
            <input
              type="text"
              value={localAddGuestSearch}
              onChange={e => setLocalAddGuestSearch(e.target.value)}
              placeholder="Search contacts..."
              className="w-full bg-[#1C1916] border border-[#2E2924] rounded-xl px-4 py-3 text-sm text-[#F0E6D3] placeholder-[#7A7068] outline-none focus:border-[#C8A96E] transition-colors mb-3"
            />
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
              {contacts
                .filter(c => !localEditContactIds.includes(c.id) && c.full_name.toLowerCase().includes(localAddGuestSearch.toLowerCase().trim()))
                .map(c => (
                  <div key={c.id} className="bg-[#1C1916] border border-[#2E2924] rounded-xl p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ background: getColor(c.full_name) }}>
                      {c.photo_url ? <img src={c.photo_url} alt={c.full_name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white">{getInitials(c.full_name)}</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-[#F0E6D3] truncate">{c.full_name}</div>
                    </div>
                    <button
                      onClick={() => handleAddGuest(c.id)}
                      className="px-3 py-1.5 rounded-lg border border-[#C8A96E33] text-[#C8A96E] text-xs font-medium hover:bg-[#C8A96E22] transition-colors flex-shrink-0"
                    >
                      Add
                    </button>
                  </div>
                ))}
              {localAddGuestSearch.trim() && contacts.filter(c => !localEditContactIds.includes(c.id) && c.full_name.toLowerCase().includes(localAddGuestSearch.toLowerCase().trim())).length === 0 && (
                <div className="text-xs text-[#7A7068] py-2">No matching contacts</div>
              )}
            </div>
          </div>

          <button onClick={handleSave} disabled={savingEdit || !localEditName.trim()}
            className="w-full py-3 bg-[#C8A96E] text-[#141210] rounded-xl font-semibold text-sm hover:bg-[#D4B87E] transition-colors disabled:opacity-60">
            {savingEdit ? "Saving..." : "Save changes"}
          </button>

          <button onClick={() => onDelete(event.id)} disabled={deletingEventId === event.id}
            className="w-full py-3 border border-red-900/50 text-red-400/80 rounded-xl text-sm font-medium hover:bg-red-900/20 transition-colors disabled:opacity-60">
            {deletingEventId === event.id ? "Deleting..." : "Delete event"}
          </button>

          <button onClick={() => onRepeat(event)}
            className="w-full py-2 border border-[#2E2924] text-[#7A7068] rounded-lg text-xs hover:text-[#F0E6D3] transition-colors">
            Do this again
          </button>
        </div>
      )}
    </div>
  );
});

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [userAvatarUrl, setUserAvatarUrl] = useState("");
  const [userDisplayName, setUserDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });

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
      const [{ data: events }, { data: contacts }, { data: interactions }] = await Promise.all([
        supabase
          .from("events")
          .select("id, name, event_date, event_time, contact_ids, message_draft, created_at, photo_url")
          .order("created_at", { ascending: false }),
        supabase.from("contacts").select("id, full_name, photo_url").order("full_name").limit(1000),
        supabase
          .from("interactions")
          .select("id, contact_id, type, occurred_on, note")
          .eq("user_id", session.user.id)
          .order("occurred_on", { ascending: false }),
      ]);
      if (events) setEvents(events);
      if (contacts) setContacts(contacts);
      if (interactions) setInteractions(interactions as Interaction[]);
      setLoading(false);
    };
    load();
  }, []);

  const formatDate = useCallback((date: string | null) => {
    if (!date) return null;
    return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }, []);

  const formatTime = useCallback((time: string | null) => {
    if (!time || !time.trim()) return null;
    const [h, m] = time.split(":").map(Number);
    const d = new Date(1970, 0, 1, h, m);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }, []);

  const isUpcoming = (date: string | null) => {
    if (!date) return false;
    const today = new Date();
    const todayY = today.getFullYear();
    const todayM = today.getMonth();
    const todayD = today.getDate();
    const [y, m, d] = date.split("-").map(Number);
    if (!y || !m || !d) return false;
    const eventDate = new Date(y, m - 1, d);
    return eventDate >= new Date(todayY, todayM, todayD);
  };

  const upcoming = events.filter(e => isUpcoming(e.event_date));
  const past = events.filter(e => !isUpcoming(e.event_date));

  const eventsByDate = useMemo(() => {
    const map: Record<string, Event[]> = {};
    events.forEach(e => {
      if (!e.event_date) return;
      if (!map[e.event_date]) map[e.event_date] = [];
      map[e.event_date].push(e);
    });
    return map;
  }, [events]);

  const interactionsByDate = useMemo(() => {
    const map: Record<string, Interaction[]> = {};
    interactions.forEach(i => {
      if (!i.occurred_on) return;
      if (!map[i.occurred_on]) map[i.occurred_on] = [];
      map[i.occurred_on].push(i);
    });
    return map;
  }, [interactions]);

  const selectedEvents = eventsByDate[selectedDate] || [];
  const selectedInteractions = interactionsByDate[selectedDate] || [];

  const startOfMonth = useMemo(() => {
    return new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  }, [currentMonth]);

  const monthLabel = useMemo(() => {
    return startOfMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [startOfMonth]);

  const monthGrid = useMemo(() => {
    const year = startOfMonth.getFullYear();
    const month = startOfMonth.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells: { date: string; inCurrentMonth: boolean }[] = [];

    // days from previous month
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const d = new Date(year, month - 1, dayNum);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      cells.push({ date: `${y}-${m}-${day}`, inCurrentMonth: false });
    }

    // current month
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const d = new Date(year, month, dayNum);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      cells.push({ date: `${y}-${m}-${day}`, inCurrentMonth: true });
    }

    // next month filler to reach full weeks (35 or 42 cells)
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1];
      const d = new Date(
        Number(last.date.slice(0, 4)),
        Number(last.date.slice(5, 7)) - 1,
        Number(last.date.slice(8, 10)) + 1
      );
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      cells.push({ date: `${y}-${m}-${day}`, inCurrentMonth: false });
    }

    return cells;
  }, [startOfMonth]);

  const todayYmd = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  const handleEventCardToggle = useCallback((event: Event) => {
    setExpanded(prev => (prev === event.id ? null : event.id));
    setEditingEventId(prev => (prev === event.id ? null : event.id));
  }, []);

  const handleSaveEdit = useCallback(async (eventId: string, payload: EventEditPayload) => {
    setSavingEdit(true);
    await supabase.from("events").update({
      name: payload.name,
      event_date: payload.date || null,
      event_time: payload.time || null,
      contact_ids: payload.contactIds,
    }).eq("id", eventId);
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, name: payload.name, event_date: payload.date || null, event_time: payload.time || null, contact_ids: payload.contactIds } : e));
    setExpanded(null);
    setEditingEventId(null);
    setSavingEdit(false);
  }, []);

  const handleRepeatEvent = useCallback((event: Event) => {
    router.push(`/plan?name=${encodeURIComponent(event.name)}`);
  }, [router]);

  const handleDeleteEvent = useCallback(async (eventId: string) => {
    if (!window.confirm("Are you sure?")) return;
    const ev = events.find(e => e.id === eventId);
    setDeletingEventId(eventId);

    if (ev && ev.contact_ids && ev.contact_ids.length > 0 && ev.event_date) {
      await supabase
        .from("interactions")
        .delete()
        .in("contact_id", ev.contact_ids)
        .eq("type", "event")
        .eq("occurred_on", ev.event_date)
        .eq("note", ev.name);
    }

    await supabase.from("events").delete().eq("id", eventId);
    setEvents(prev => prev.filter(e => e.id !== eventId));
    setExpanded(null);
    setEditingEventId(null);
    setDeletingEventId(null);
  }, [events]);

  const getContact = useCallback((id: string) => contacts.find(c => c.id === id), [contacts]);

  return (
    <main className="h-screen flex flex-col bg-[#141210] text-[#F0E6D3] pb-24 overflow-hidden">
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-5 border-b border-[#2E2924] bg-[#141210] z-10">
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

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-6">
        {loading ? (
          <div className="text-center text-[#7A7068] text-sm py-12">Loading...</div>
        ) : (
          <>
            <div className="bg-[#1C1916] border border-[#2E2924] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                  }
                  className="px-2 py-1 text-sm text-[#7A7068] hover:text-[#F0E6D3] rounded-lg hover:bg-[#231F1B] transition-colors"
                >
                  ←
                </button>
                <div className="text-sm font-medium text-[#F0E6D3]">{monthLabel}</div>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                  }
                  className="px-2 py-1 text-sm text-[#7A7068] hover:text-[#F0E6D3] rounded-lg hover:bg-[#231F1B] transition-colors"
                >
                  →
                </button>
              </div>
              <div className="grid grid-cols-7 text-[10px] text-[#7A7068] mb-1">
                <div className="text-center">Sun</div>
                <div className="text-center">Mon</div>
                <div className="text-center">Tue</div>
                <div className="text-center">Wed</div>
                <div className="text-center">Thu</div>
                <div className="text-center">Fri</div>
                <div className="text-center">Sat</div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-xs">
                {monthGrid.map(cell => {
                  const hasEvents = !!eventsByDate[cell.date];
                  const hasInteractions = !!interactionsByDate[cell.date];
                  const isToday = cell.date === todayYmd;
                  const isSelected = cell.date === selectedDate;
                  const dayNum = Number(cell.date.slice(8, 10));
                  return (
                    <button
                      key={cell.date}
                      type="button"
                      onClick={() => setSelectedDate(cell.date)}
                      className={
                        "flex flex-col items-center justify-center rounded-lg py-1.5 transition-colors " +
                        (isSelected
                          ? "bg-[#28211A] border border-[#C8A96E]"
                          : "border border-transparent hover:bg-[#231F1B]") +
                        " " +
                        (cell.inCurrentMonth ? "" : "opacity-40")
                      }
                    >
                      <div
                        className={
                          "text-[11px] " +
                          (isToday ? "text-[#C8A96E] font-semibold" : "text-[#F0E6D3]")
                        }
                      >
                        {dayNum}
                      </div>
                      <div className="flex items-center justify-center gap-0.5 mt-0.5 h-1.5">
                        {hasEvents && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C8A96E]" />
                        )}
                        {hasInteractions && (
                          <span className="w-1 h-1 rounded-full bg-[#7A7068]" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 space-y-3">
                {selectedEvents.length === 0 && selectedInteractions.length === 0 && (
                  <div className="text-xs text-[#7A7068]">
                    No events or interactions on this day.
                  </div>
                )}
                {selectedEvents.length > 0 && (
                  <div>
                    <div className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold mb-1">
                      Events
                    </div>
                    <div className="space-y-1">
                      {selectedEvents.map(ev => (
                        <div key={ev.id} className="flex items-center justify-between text-xs">
                          <span className="text-[#F0E6D3] truncate">{ev.name}</span>
                          {ev.event_time && (
                            <span className="text-[#7A7068] ml-2">
                              {formatTime(ev.event_time)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedInteractions.length > 0 && (
                  <div>
                    <div className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold mb-1">
                      Interactions
                    </div>
                    <div className="space-y-1">
                      {selectedInteractions.map(int => {
                        const contact = getContact(int.contact_id);
                        return (
                          <div key={int.id} className="flex items-center justify-between text-xs">
                            <span className="text-[#F0E6D3] truncate">
                              {contact ? contact.full_name : "Someone"} · {int.type}
                            </span>
                            {int.note && (
                              <span className="text-[#7A7068] ml-2 truncate max-w-[8rem]">
                                {int.note}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

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
                      {upcoming.map(e => (
                        <EventCard
                          key={e.id}
                          event={e}
                          isOpen={expanded === e.id}
                          isEditing={editingEventId === e.id}
                          onToggle={handleEventCardToggle}
                          onSaveEdit={handleSaveEdit}
                          onDelete={handleDeleteEvent}
                          onRepeat={handleRepeatEvent}
                          contacts={contacts}
                          formatDate={formatDate}
                          formatTime={formatTime}
                          router={router}
                          savingEdit={savingEdit}
                          deletingEventId={deletingEventId}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {past.length > 0 && (
                  <div>
                    <div className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold mb-3">Past</div>
                    <div className="flex flex-col gap-2">
                      {past.map(e => (
                        <EventCard
                          key={e.id}
                          event={e}
                          isOpen={expanded === e.id}
                          isEditing={editingEventId === e.id}
                          onToggle={handleEventCardToggle}
                          onSaveEdit={handleSaveEdit}
                          onDelete={handleDeleteEvent}
                          onRepeat={handleRepeatEvent}
                          contacts={contacts}
                          formatDate={formatDate}
                          formatTime={formatTime}
                          router={router}
                          savingEdit={savingEdit}
                          deletingEventId={deletingEventId}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
