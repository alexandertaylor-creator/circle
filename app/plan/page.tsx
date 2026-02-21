"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Contact = {
  id: string;
  full_name: string;
  last_contacted: string | null;
  interests: string[] | null;
  groups: string[] | null;
  photo_url: string | null;
};

type Step = "name" | "filter" | "message" | "done";

function PlanPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appliedContactIdsRef = useRef(false);
  const [step, setStep] = useState<Step>("name");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [allInterests, setAllInterests] = useState<string[]>([]);
  const [allGroups, setAllGroups] = useState<string[]>([]);
  const [activeFilters, setActiveFilters] = useState<{ label: string; kind: "interest" | "group" }[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [preSelectedIds, setPreSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth");
        return;
      }
      const { data } = await supabase
        .from("contacts")
        .select("id, full_name, last_contacted, interests, groups, photo_url")
        .order("full_name")
        .limit(1000);
      if (data) {
        setContacts(data);
        setAllInterests(Array.from(new Set(data.flatMap(c => c.interests || []))).sort());
        setAllGroups(Array.from(new Set(data.flatMap(c => c.groups || []))).sort());
      }
      setLoading(false);
    };
    load();
  }, [router]);

  // After contacts have loaded, read contactIds from URL and store in preSelectedIds (user stays on name step)
  useEffect(() => {
    if (loading) return;
    if (appliedContactIdsRef.current) return;
    const contactIdsParam = searchParams.get("contactIds");
    if (!contactIdsParam) return;
    appliedContactIdsRef.current = true;
    const ids = contactIdsParam.split(",").map(s => s.trim()).filter(Boolean);
    const validIds = ids.filter(id => contacts.some(c => c.id === id));
    setPreSelectedIds(validIds);
  }, [loading, searchParams, contacts]);

  const filteredContacts = contacts.filter(c => {
    if (activeFilters.length === 0) return true;
    return activeFilters.every(f => {
      if (f.kind === "interest") return (c.interests || []).includes(f.label);
      return (c.groups || []).includes(f.label);
    });
  });

  const prevStepRef = useRef<Step>("name");
  useEffect(() => {
    // Only apply initial selection when coming from name step (first time entering guests step). Going Back from message preserves selection and activeFilters.
    if (prevStepRef.current === "name" && step === "filter") {
      if (preSelectedIds.length > 0) {
        setSelected(preSelectedIds);
        setPreSelectedIds([]);
      } else {
        setSelected(filteredContacts.map(c => c.id));
      }
    }
    prevStepRef.current = step;
  }, [step, filteredContacts, preSelectedIds]);

  const selectedContacts = contacts.filter(c => selected.includes(c.id));

  const getInitials = (name: string) =>
    name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  const getColor = (name: string) => {
    const colors = ["#5A7E9E", "#7E5A9E", "#5A9E78", "#9E7A5A", "#9E5A6A", "#6A9E5A", "#5A8E9E", "#9E905A"];
    return colors[name.charCodeAt(0) % colors.length];
  };

  const isFilterActive = (label: string, kind: "interest" | "group") =>
    activeFilters.some(f => f.label === label && f.kind === kind);

  const toggleFilter = (label: string, kind: "interest" | "group") => {
    if (isFilterActive(label, kind)) {
      setActiveFilters(prev => prev.filter(f => !(f.label === label && f.kind === kind)));
    } else {
      setActiveFilters(prev => [...prev, { label, kind }]);
    }
  };

  const toggleGuest = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleReviewGuestList = () => {
    setMessage(generateMessage());
    setStep("message");
  };

  const generateMessage = () => {
    const names = selectedContacts.map(c => c.full_name.split(" ")[0]);
    const nameList = names.length <= 2
      ? names.join(" and ")
      : names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
    const dateStr = eventDate
      ? " on " + new Date(eventDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
      : "";
    return "Hey " + nameList + "! Want to join me for " + eventName + dateStr + "? Let me know if you are in!";
  };

  const handleSaveAndCopy = () => {
    setStep("done");
  };

  const steps: Step[] = ["name", "filter", "message", "done"];
  const stepIndex = steps.indexOf(step);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#141210] flex items-center justify-center">
        <div className="font-serif italic text-[#C8A96E] text-2xl">circle</div>
      </main>
    );
  }

  if (step === "done") {
    return (
      <DoneStep
        message={message}
        eventName={eventName}
        invitedCount={selected.length}
        selectedIds={selected}
        eventDate={eventDate}
        eventTime={eventTime}
        onBack={() => router.push("/dashboard")}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#141210] text-[#F0E6D3] pb-32">
      <header className="flex items-center justify-between px-6 py-5 border-b border-[#2E2924] sticky top-0 bg-[#141210] z-10">
        <button
          onClick={() => (step === "name" ? router.push("/dashboard") : setStep(steps[stepIndex - 1]))}
          className="text-sm text-[#7A7068] hover:text-[#F0E6D3] transition-colors"
        >
          {step === "name" ? "Cancel" : "Back"}
        </button>
        <span className="font-serif italic text-[#C8A96E] text-lg">Plan something</span>
        <div className="text-xs text-[#7A7068]">{stepIndex + 1} / {steps.length}</div>
      </header>

      <div className="h-0.5 bg-[#2E2924]">
        <div
          className="h-full bg-[#C8A96E] transition-all duration-300"
          style={{ width: ((stepIndex + 1) / steps.length) * 100 + "%" }}
        />
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">
        {/* Step 1 — Name */}
        {step === "name" && (
          <>
            <div className="mb-2">
              <div className="font-serif text-2xl text-[#F0E6D3] mb-1">What are you planning?</div>
              <div className="text-sm text-[#7A7068]">Give your event a name and optional date.</div>
            </div>
            {allInterests.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {allInterests.slice(0, 6).map(interest => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => {
                      setEventName(interest);
                      setActiveFilters(prev =>
                        prev.some(f => f.label === interest && f.kind === "interest")
                          ? prev
                          : [...prev, { label: interest, kind: "interest" }]
                      );
                    }}
                    className={"px-3 py-1.5 rounded-full text-xs border transition-all capitalize " + (eventName === interest ? "border-[#C8A96E] text-[#C8A96E] bg-[#28211A]" : "border-[#2E2924] text-[#7A7068]")}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            )}
            <input
              type="text"
              placeholder="Event name"
              value={eventName}
              onChange={e => setEventName(e.target.value)}
              className="w-full bg-[#1C1916] border border-[#2E2924] rounded-xl px-4 py-3 text-base text-[#F0E6D3] placeholder-[#7A7068] outline-none focus:border-[#C8A96E] transition-colors"
            />
            <input
              type="date"
              value={eventDate}
              onChange={e => setEventDate(e.target.value)}
              className="w-full bg-[#1C1916] border border-[#2E2924] rounded-xl px-4 py-3 text-sm text-[#F0E6D3] outline-none focus:border-[#C8A96E] transition-colors"
            />
            <input
              type="time"
              value={eventTime}
              onChange={e => setEventTime(e.target.value)}
              className="w-full bg-[#1C1916] border border-[#2E2924] rounded-xl px-4 py-3 text-sm text-[#F0E6D3] outline-none focus:border-[#C8A96E] transition-colors"
            />
            <button
              onClick={() => setStep("filter")}
              disabled={!eventName.trim()}
              className="w-full py-4 bg-[#C8A96E] text-[#141210] rounded-xl font-semibold text-sm hover:bg-[#D4B87E] transition-colors disabled:bg-[#2E2924] disabled:text-[#7A7068]"
            >
              Next
            </button>
          </>
        )}

        {/* Step 2 — Filter */}
        {step === "filter" && (
          <>
            <div className="mb-2">
              <div className="font-serif text-2xl text-[#F0E6D3] mb-1">Who should come?</div>
              <div className="text-sm text-[#7A7068]">Filter by interests or groups.</div>
            </div>
            {allInterests.length > 0 && (
              <div>
                <div className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold mb-2">Interests</div>
                <div className="flex flex-wrap gap-2">
                  {allInterests.map(i => (
                    <button
                      key={i}
                      onClick={() => toggleFilter(i, "interest")}
                      className={"px-3 py-1.5 rounded-full text-xs border transition-all capitalize " + (isFilterActive(i, "interest") ? "border-[#C8A96E] text-[#C8A96E] bg-[#28211A]" : "border-[#2E2924] text-[#7A7068]")}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {allGroups.length > 0 && (
              <div>
                <div className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold mb-2">Groups</div>
                <div className="flex flex-wrap gap-2">
                  {allGroups.map(g => (
                    <button
                      key={g}
                      onClick={() => toggleFilter(g, "group")}
                      className={"px-3 py-1.5 rounded-full text-xs border transition-all capitalize " + (isFilterActive(g, "group") ? "border-[#C8A96E] text-[#C8A96E] bg-[#28211A]" : "border-[#2E2924] text-[#7A7068]")}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold mb-2">
              {selected.length} selected
            </div>
            <div className="flex flex-col gap-2">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => toggleGuest(contact.id)}
                  className={"bg-[#1C1916] border rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition-all " + (selected.includes(contact.id) ? "border-[#C8A96E33]" : "border-[#2E2924] opacity-60")}
                >
                  <div
                    className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden"
                    style={{ background: getColor(contact.full_name) }}
                  >
                    {contact.photo_url ? (
                      <img src={contact.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white">
                        {getInitials(contact.full_name)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm text-[#F0E6D3]">{contact.full_name}</div>
                  </div>
                  <div className={"w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 " + (selected.includes(contact.id) ? "border-[#C8A96E] bg-[#C8A96E]" : "border-[#2E2924]")}>
                    {selected.includes(contact.id) && <span className="text-[#141210] text-xs">✓</span>}
                  </div>
                </div>
              ))}
            </div>
            {filteredContacts.length === 0 && (
              <div className="text-sm text-[#7A7068] py-4">No contacts match. Clear filters or add people first.</div>
            )}
            <button
              onClick={handleReviewGuestList}
              disabled={selected.length === 0}
              className="w-full py-4 bg-[#C8A96E] text-[#141210] rounded-xl font-semibold text-sm hover:bg-[#D4B87E] transition-colors disabled:bg-[#2E2924] disabled:text-[#7A7068] disabled:cursor-not-allowed"
            >
              Finalize event & send message
            </button>
          </>
        )}

        {/* Step 3 — Message */}
        {step === "message" && (
          <>
            <div className="mb-2">
              <div className="font-serif text-2xl text-[#F0E6D3] mb-1">Your message</div>
              <div className="text-sm text-[#7A7068]">{selected.length} {selected.length === 1 ? "person" : "people"} invited. Edit and copy.</div>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {selectedContacts.slice(0, 6).map((c) => (
                <span key={c.id} className="text-xs px-2 py-1 rounded-full bg-[#28211A] border border-[#C8A96E33] text-[#C8A96E]">
                  {c.full_name.split(" ")[0]}
                </span>
              ))}
              {selectedContacts.length > 6 && (
                <span className="text-xs px-2 py-1 rounded-full bg-[#28211A] border border-[#2E2924] text-[#7A7068]">
                  +{selectedContacts.length - 6} more
                </span>
              )}
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full bg-[#1C1916] border border-[#2E2924] rounded-xl px-4 py-3 text-sm text-[#F0E6D3] outline-none focus:border-[#C8A96E] transition-colors resize-none"
            />
            <button
              onClick={handleSaveAndCopy}
              className="w-full py-4 bg-[#C8A96E] text-[#141210] rounded-xl font-semibold text-sm hover:bg-[#D4B87E] transition-colors"
            >
              Save and copy message
            </button>
          </>
        )}
      </div>
    </main>
  );
}

function DoneStep({
  message,
  eventName,
  invitedCount,
  selectedIds,
  eventDate,
  eventTime,
  onBack,
}: {
  message: string;
  eventName: string;
  invitedCount: number;
  selectedIds: string[];
  eventDate: string;
  eventTime: string;
  onBack: () => void;
}) {
  const savedRef = useRef(false);

  useEffect(() => {
    if (message) navigator.clipboard.writeText(message);
  }, [message]);

  useEffect(() => {
    if (savedRef.current) return;
    savedRef.current = true;
    const save = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await supabase.from("events").insert({
        user_id: session.user.id,
        name: eventName,
        event_date: eventDate || null,
        event_time: eventTime || null,
        contact_ids: selectedIds,
      });
    };
    save();
  }, [eventName, eventDate, eventTime, selectedIds]);

  return (
    <main className="min-h-screen bg-[#141210] flex flex-col items-center justify-center gap-6 px-6">
      <div className="text-center">
        <div className="font-serif text-2xl text-[#F0E6D3] mb-2">{eventName}</div>
        <div className="text-sm text-[#7A7068]">{invitedCount} {invitedCount === 1 ? "person" : "people"} invited</div>
      </div>
      <div className="text-[#F0E6D3] text-sm">Message copied to clipboard</div>
      <button
        onClick={onBack}
        className="w-full max-w-sm py-3 bg-[#C8A96E] text-[#141210] rounded-xl font-semibold text-sm hover:bg-[#D4B87E] transition-colors"
      >
        Back to home
      </button>
    </main>
  );
}

export default function PlanPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#141210]" />}>
      <PlanPageInner />
    </Suspense>
  );
}
