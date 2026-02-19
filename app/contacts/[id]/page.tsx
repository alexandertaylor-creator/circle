"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Contact = {
  id: string;
  full_name: string;
  last_contacted: string | null;
  notes: string | null;
  interests: string[] | null;
  groups: string[] | null;
  created_at: string;
  photo_url: string | null;
};

export default function ContactProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editGroups, setEditGroups] = useState<string[]>([]);
  const [editInterests, setEditInterests] = useState<string[]>([]);
  const [groupInput, setGroupInput] = useState("");
  const [interestInput, setInterestInput] = useState("");
  const [allGroups, setAllGroups] = useState<string[]>([]);
  const [allInterests, setAllInterests] = useState<string[]>([]);
  const [savingGroupsInterests, setSavingGroupsInterests] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/auth"); return; }
      const { data } = await supabase
        .from("contacts")
        .select("id, full_name, last_contacted, notes, interests, groups, created_at, photo_url")
        .eq("id", id)
        .single();
      if (data) {
        setContact(data);
        setNotes(data.notes || "");
      }
      const { data: allData } = await supabase.from("contacts").select("interests, groups");
      if (allData) {
        setAllGroups(Array.from(new Set(allData.flatMap(c => c.groups || []))).sort());
        setAllInterests(Array.from(new Set(allData.flatMap(c => c.interests || []))).sort());
      }
      setLoading(false);
    };
    load();
  }, [id, router]);

  const groupSuggestions = !groupInput.trim() ? [] : allGroups.filter(
    g => g.toLowerCase().includes(groupInput.toLowerCase()) && !editGroups.includes(g)
  );
  const interestSuggestions = !interestInput.trim() ? [] : allInterests.filter(
    i => i.toLowerCase().includes(interestInput.toLowerCase()) && !editInterests.includes(i)
  );

  const startEditMode = () => {
    if (!contact) return;
    setEditGroups(contact.groups ? [...contact.groups] : []);
    setEditInterests(contact.interests ? [...contact.interests] : []);
    setGroupInput("");
    setInterestInput("");
    setEditMode(true);
  };

  const cancelEditMode = () => {
    setEditMode(false);
    setGroupInput("");
    setInterestInput("");
  };

  const addEditGroup = (val: string) => {
    const clean = val.trim().toLowerCase();
    if (!clean || editGroups.includes(clean)) return;
    setEditGroups(prev => [...prev, clean]);
    setGroupInput("");
  };

  const removeEditGroup = (g: string) => setEditGroups(prev => prev.filter(x => x !== g));

  const addEditInterest = (val: string) => {
    const clean = val.trim().toLowerCase();
    if (!clean || editInterests.includes(clean)) return;
    setEditInterests(prev => [...prev, clean]);
    setInterestInput("");
  };

  const removeEditInterest = (i: string) => setEditInterests(prev => prev.filter(x => x !== i));

  const saveGroupsInterests = async () => {
    if (!contact) return;
    setSavingGroupsInterests(true);
    await supabase.from("contacts").update({ groups: editGroups, interests: editInterests }).eq("id", contact.id);
    setContact(prev => prev ? { ...prev, groups: editGroups, interests: editInterests } : null);
    setEditMode(false);
    setGroupInput("");
    setInterestInput("");
    setSavingGroupsInterests(false);
  };

  const deleteContact = async () => {
    if (!contact) return;
    setDeleting(true);
    await supabase.from("contacts").delete().eq("id", contact.id);
    router.push("/dashboard");
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !contact) return;
    e.target.value = "";
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setUploadingPhoto(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${session.user.id}/${contact.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) {
      setUploadingPhoto(false);
      console.error(uploadError);
      return;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const photoUrl = urlData.publicUrl;
    await supabase.from("contacts").update({ photo_url: photoUrl }).eq("id", contact.id);
    setContact(prev => prev ? { ...prev, photo_url: photoUrl } : null);
    setUploadingPhoto(false);
  };

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

  const saveNotes = async () => {
    if (!contact) return;
    setSavingNotes(true);
    await supabase.from("contacts").update({ notes }).eq("id", contact.id);
    setContact(prev => prev ? { ...prev, notes } : null);
    setEditingNotes(false);
    setSavingNotes(false);
  };

  const logInteraction = async () => {
    if (!contact) return;
    const today = new Date().toISOString().split("T")[0];
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("interactions").insert({
      user_id: session.user.id,
      contact_id: contact.id,
      occurred_on: today,
      type: "hangout",
    });
    setContact(prev => prev ? { ...prev, last_contacted: today } : null);
  };

  if (loading) return (
    <main className="min-h-screen bg-[#141210] flex items-center justify-center">
      <div className="font-serif italic text-[#C8A96E] text-2xl">circle</div>
    </main>
  );

  if (!contact) return (
    <main className="min-h-screen bg-[#141210] flex items-center justify-center">
      <div className="text-[#7A7068]">Contact not found.</div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#141210] text-[#F0E6D3] pb-12">
      <header className="flex items-center justify-between px-6 py-5 border-b border-[#2E2924] sticky top-0 bg-[#141210] z-10">
        <button
          onClick={editMode ? cancelEditMode : () => router.back()}
          className="text-sm text-[#7A7068] hover:text-[#F0E6D3] transition-colors"
        >
          {editMode ? "Cancel" : "Back"}
        </button>
        <button onClick={() => router.push("/dashboard")} className="font-serif italic text-[#C8A96E] text-lg">circle</button>
        {editMode ? (
          <button
            onClick={saveGroupsInterests}
            disabled={savingGroupsInterests}
            className="text-sm font-semibold text-[#C8A96E] disabled:text-[#7A7068] transition-colors"
          >
            {savingGroupsInterests ? "Saving..." : "Save"}
          </button>
        ) : (
          <button onClick={startEditMode} className="text-sm text-[#C8A96E] hover:text-[#D4B87E] transition-colors">
            Edit
          </button>
        )}
      </header>

      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">

        {/* Avatar + name */}
        <div className="flex flex-col items-center gap-4 py-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoSelect}
          />
          <button
            type="button"
            onClick={(e) => {
              const input = fileInputRef.current;
              if (input) input.click();
            }}
            disabled={uploadingPhoto}
            className="relative w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold text-white flex-shrink-0 overflow-hidden border-2 border-[#2E2924] hover:border-[#C8A96E44] transition-colors disabled:opacity-70"
            style={{ background: contact.photo_url ? "transparent" : getColor(contact.full_name) }}
          >
            {uploadingPhoto ? (
              <div className="absolute inset-0 flex items-center justify-center bg-[#141210]/80">
                <span className="text-[#C8A96E] text-sm">...</span>
              </div>
            ) : contact.photo_url ? (
              <img src={contact.photo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              getInitials(contact.full_name)
            )}
            {!uploadingPhoto && (
              <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#141210] border border-[#2E2924] flex items-center justify-center">
                <svg className="w-4 h-4 text-[#C8A96E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 13v4a2 2 0 01-2 2H7a2 2 0 01-2-2v-4M14 12v.01" />
                </svg>
              </div>
            )}
          </button>
          <div className="text-center">
            <div className="font-serif text-2xl text-[#F0E6D3]">{contact.full_name}</div>
            <div className="text-sm text-[#7A7068] mt-1">Last seen {getLastSeen(contact.last_contacted)}</div>
          </div>
        </div>

        {/* Log hangout button */}
        <button onClick={logInteraction}
          className="w-full py-3 border border-[#C8A96E] text-[#C8A96E] rounded-xl text-sm font-semibold hover:bg-[#28211A] transition-colors">
          Log a hangout
        </button>

        {/* Groups */}
        <div className="bg-[#1C1916] border border-[#2E2924] rounded-2xl p-4">
          <div className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold mb-3">Groups</div>
          {editMode ? (
            <>
              <div className="flex flex-wrap gap-2 mb-3">
                {editGroups.map(g => (
                  <span key={g} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#28211A] border border-[#C8A96E33] text-[#C8A96E] text-xs capitalize">
                    {g}
                    <button onClick={() => removeEditGroup(g)} className="text-[#C8A96E] hover:text-white transition-colors leading-none">x</button>
                  </span>
                ))}
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Add a group..."
                  value={groupInput}
                  onChange={e => setGroupInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addEditGroup(groupInput); } }}
                  className="w-full bg-[#231F1B] border border-[#2E2924] rounded-lg px-3 py-2 text-sm text-[#F0E6D3] placeholder-[#7A7068] outline-none focus:border-[#C8A96E] transition-colors"
                />
                {(groupSuggestions.length > 0 || (groupInput.trim() && !allGroups.includes(groupInput.trim().toLowerCase()))) && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#231F1B] border border-[#2E2924] rounded-lg overflow-hidden z-20">
                    {groupSuggestions.map(s => (
                      <button key={s} onClick={() => addEditGroup(s)} className="w-full text-left px-3 py-2 text-sm text-[#F0E6D3] hover:bg-[#28211A] transition-colors">
                        {s}
                      </button>
                    ))}
                    {groupInput.trim() && !allGroups.includes(groupInput.trim().toLowerCase()) && (
                      <button onClick={() => addEditGroup(groupInput)} className="w-full text-left px-3 py-2 text-sm text-[#C8A96E] hover:bg-[#28211A] transition-colors border-t border-[#2E2924]">
                        + Create "{groupInput.trim()}"
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-wrap gap-2">
              {contact.groups && contact.groups.length > 0 ? contact.groups.map(g => (
                <span key={g} className="px-3 py-1.5 rounded-full bg-[#28211A] border border-[#C8A96E33] text-[#C8A96E] text-xs capitalize">
                  {g}
                </span>
              )) : <span className="text-sm text-[#7A7068]">No groups</span>}
            </div>
          )}
        </div>

        {/* Interests */}
        <div className="bg-[#1C1916] border border-[#2E2924] rounded-2xl p-4">
          <div className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold mb-3">Interests</div>
          {editMode ? (
            <>
              <div className="flex flex-wrap gap-2 mb-3">
                {editInterests.map(i => (
                  <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#28211A] border border-[#C8A96E44] text-[#C8A96E] text-xs capitalize">
                    {i}
                    <button onClick={() => removeEditInterest(i)} className="text-[#C8A96E] hover:text-white transition-colors leading-none">x</button>
                  </span>
                ))}
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Add an interest..."
                  value={interestInput}
                  onChange={e => setInterestInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addEditInterest(interestInput); } }}
                  className="w-full bg-[#231F1B] border border-[#2E2924] rounded-lg px-3 py-2 text-sm text-[#F0E6D3] placeholder-[#7A7068] outline-none focus:border-[#C8A96E] transition-colors"
                />
                {(interestSuggestions.length > 0 || (interestInput.trim() && !allInterests.includes(interestInput.trim().toLowerCase()))) && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#231F1B] border border-[#2E2924] rounded-lg overflow-hidden z-20">
                    {interestSuggestions.map(s => (
                      <button key={s} onClick={() => addEditInterest(s)} className="w-full text-left px-3 py-2 text-sm text-[#F0E6D3] hover:bg-[#28211A] transition-colors">
                        {s}
                      </button>
                    ))}
                    {interestInput.trim() && !allInterests.includes(interestInput.trim().toLowerCase()) && (
                      <button onClick={() => addEditInterest(interestInput)} className="w-full text-left px-3 py-2 text-sm text-[#C8A96E] hover:bg-[#28211A] transition-colors border-t border-[#2E2924]">
                        + Create "{interestInput.trim()}"
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-wrap gap-2">
              {contact.interests && contact.interests.length > 0 ? contact.interests.map(i => (
                <span key={i} className="px-3 py-1.5 rounded-full bg-[#1C1916] border border-[#2E2924] text-[#F0E6D3] text-xs capitalize">
                  {i}
                </span>
              )) : <span className="text-sm text-[#7A7068]">No interests</span>}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-[#1C1916] border border-[#2E2924] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold">Notes</div>
            {!editingNotes && (
              <button onClick={() => setEditingNotes(true)} className="text-xs text-[#C8A96E] hover:text-[#D4B87E] transition-colors">
                {notes ? "Edit" : "Add note"}
              </button>
            )}
          </div>
          {editingNotes ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Anything worth remembering about this person..."
                rows={4}
                className="w-full bg-[#231F1B] border border-[#2E2924] rounded-lg px-3 py-2 text-sm text-[#F0E6D3] placeholder-[#7A7068] outline-none focus:border-[#C8A96E] transition-colors resize-none"
              />
              <div className="flex gap-2">
                <button onClick={saveNotes} disabled={savingNotes}
                  className="flex-1 py-2 bg-[#C8A96E] text-[#141210] rounded-lg text-sm font-semibold hover:bg-[#D4B87E] transition-colors">
                  {savingNotes ? "Saving..." : "Save"}
                </button>
                <button onClick={() => { setEditingNotes(false); setNotes(contact.notes || ""); }}
                  className="flex-1 py-2 border border-[#2E2924] text-[#7A7068] rounded-lg text-sm hover:text-[#F0E6D3] transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-[#7A7068] leading-relaxed">
              {notes || "No notes yet."}
            </div>
          )}
        </div>

        {/* Added date */}
        <div className="text-center text-xs text-[#3A3530]">
          Added {new Date(contact.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </div>

        {/* Delete contact */}
        <div className="pt-4">
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-3 border border-[#6B4A4A] text-[#A67A7A] rounded-xl text-sm font-medium hover:bg-[#2E2222] hover:border-[#8B5A5A] transition-colors"
            >
              Delete contact
            </button>
          ) : (
            <div className="bg-[#1C1916] border border-[#2E2924] rounded-2xl p-4 flex flex-col gap-3">
              <p className="text-sm text-[#F0E6D3]">Are you sure? This can&apos;t be undone.</p>
              <div className="flex gap-2">
                <button
                  onClick={deleteContact}
                  disabled={deleting}
                  className="flex-1 py-2 bg-[#8B4545] text-white rounded-lg text-sm font-semibold hover:bg-[#A05555] transition-colors disabled:opacity-60"
                >
                  {deleting ? "Deleting..." : "Confirm delete"}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 py-2 border border-[#2E2924] text-[#7A7068] rounded-lg text-sm hover:text-[#F0E6D3] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
