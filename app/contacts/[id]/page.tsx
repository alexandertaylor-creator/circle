"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { BottomNav } from "@/components/BottomNav";

type Contact = {
  id: string;
  full_name: string;
  last_contacted: string | null;
  notes: string | null;
  interests: string[] | null;
  groups: string[] | null;
  created_at: string;
  photo_url: string | null;
  dob: string | null;
  phone: string | null;
};

type Interaction = {
  id?: string;
  type: string;
  occurred_on: string;
  note: string | null;
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
  const [editingGroups, setEditingGroups] = useState(false);
  const [editingInterests, setEditingInterests] = useState(false);
  const [groupInput, setGroupInput] = useState("");
  const [interestInput, setInterestInput] = useState("");
  const [allGroups, setAllGroups] = useState<string[]>([]);
  const [allInterests, setAllInterests] = useState<string[]>([]);
  const [savingGroups, setSavingGroups] = useState(false);
  const [savingInterests, setSavingInterests] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [phone, setPhone] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const [editingDob, setEditingDob] = useState(false);
  const [dobInput, setDobInput] = useState("");
  const [savingDob, setSavingDob] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logType, setLogType] = useState<string | null>(null);
  const [logDate, setLogDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [logNotes, setLogNotes] = useState("");
  const [logSaving, setLogSaving] = useState(false);
  const [logShowSuccess, setLogShowSuccess] = useState(false);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [editingInteractionId, setEditingInteractionId] = useState<string | null>(null);
  const [editInteractionType, setEditInteractionType] = useState<string>("hangout");
  const [editInteractionDate, setEditInteractionDate] = useState("");
  const [editInteractionNote, setEditInteractionNote] = useState("");
  const [savingInteractionEdit, setSavingInteractionEdit] = useState(false);
  const [confirmDeleteInteractionId, setConfirmDeleteInteractionId] = useState<string | null>(null);
  const [deletingInteractionId, setDeletingInteractionId] = useState<string | null>(null);
  const [userAvatarUrl, setUserAvatarUrl] = useState("");
  const [userDisplayName, setUserDisplayName] = useState("");
  const [interactionsShown, setInteractionsShown] = useState(10);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const INTERACTIONS_PAGE_SIZE = 10;
  const INTERACTION_TYPES = [
    { label: "Hung out", value: "hangout" },
    { label: "Called", value: "call" },
    { label: "Texted", value: "message" },
    { label: "Event", value: "event" },
    { label: "Other", value: "other" },
  ] as const;

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/auth"); return; }
      const [{ data }, { data: interactionsData }, { data: allData }, { data: profileData }] = await Promise.all([
        supabase.from("contacts").select("id, full_name, last_contacted, notes, interests, groups, created_at, photo_url, dob, phone").eq("id", id).single(),
        supabase.from("interactions").select("id, type, occurred_on, note").eq("contact_id", id).order("occurred_on", { ascending: false }),
        supabase.from("contacts").select("interests, groups").limit(1000),
        supabase.from("profiles").select("interests, avatar_url, display_name").eq("id", session.user.id).maybeSingle(),
      ]);
      if (data) {
        setContact(data);
        setNotes(data.notes || "");
        setPhone(data.phone || "");
        setDobInput(data.dob ? String(data.dob) : "");
      }
      if (interactionsData) {
        setInteractions(interactionsData as Interaction[]);
        setInteractionsShown(INTERACTIONS_PAGE_SIZE);
      }
      if (allData) {
        setAllGroups(Array.from(new Set(allData.flatMap((c: { groups?: string[] | null }) => c.groups || []))).sort());
        const fromContacts = allData.flatMap((c: { interests?: string[] | null }) => c.interests || []);
        const fromProfiles = Array.isArray(profileData?.interests) ? profileData.interests : [];
        setAllInterests(Array.from(new Set([...fromContacts, ...fromProfiles])).sort());
      } else {
        const fromProfiles = Array.isArray(profileData?.interests) ? profileData.interests : [];
        if (fromProfiles.length > 0) setAllInterests(Array.from(new Set(fromProfiles)).sort());
      }
      const profile = profileData as { avatar_url?: string; display_name?: string } | null;
      if (profile?.avatar_url) setUserAvatarUrl(profile.avatar_url);
      if (profile?.display_name) setUserDisplayName(profile.display_name);
      setLoading(false);
    };
    load();
  }, [id, router]);

  const groupSuggestions = !groupInput.trim() ? [] : allGroups.filter(
    g => g.toLowerCase().includes(groupInput.toLowerCase()) && !editGroups.some(eg => eg.toLowerCase() === g.toLowerCase())
  );
  const interestSuggestions = !interestInput.trim() ? [] : allInterests.filter(
    i => i.toLowerCase().includes(interestInput.toLowerCase()) && !editInterests.some(ei => ei.toLowerCase() === i.toLowerCase())
  );

  const startEditMode = () => {
    if (!contact) return;
    setEditMode(true);
  };

  const cancelEditMode = () => {
    setEditMode(false);
    setEditingName(false);
    if (contact) setNameInput(contact.full_name);
  };

  const addEditGroup = (val: string) => {
    const clean = val.trim();
    if (!clean) return;
    const lower = clean.toLowerCase();
    if (editGroups.some(g => g.toLowerCase() === lower)) return;
    setEditGroups(prev => [...prev, clean]);
    setGroupInput("");
  };

  const removeEditGroup = (g: string) => setEditGroups(prev => prev.filter(x => x !== g));

  const addEditInterest = (val: string) => {
    const clean = val.trim();
    if (!clean) return;
    const lower = clean.toLowerCase();
    if (editInterests.some(i => i.toLowerCase() === lower)) return;
    setEditInterests(prev => [...prev, clean]);
    setInterestInput("");
  };

  const removeEditInterest = (i: string) => setEditInterests(prev => prev.filter(x => x !== i));

  const saveGroups = async () => {
    if (!contact) return;
    setSavingGroups(true);
    await supabase.from("contacts").update({ groups: editGroups }).eq("id", contact.id);
    setContact(prev => prev ? { ...prev, groups: editGroups } : null);
    setEditingGroups(false);
    setGroupInput("");
    setSavingGroups(false);
  };

  const saveInterests = async () => {
    if (!contact) return;
    setSavingInterests(true);
    await supabase.from("contacts").update({ interests: editInterests }).eq("id", contact.id);
    setContact(prev => prev ? { ...prev, interests: editInterests } : null);
    setEditingInterests(false);
    setInterestInput("");
    setSavingInterests(false);
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
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const [y, m, d] = date.split("-").map(Number);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return "Never";
    const dateMidnight = new Date(y, m - 1, d).getTime();
    const days = Math.floor((todayMidnight - dateMidnight) / 86400000);
    if (days < 0) return "Upcoming";
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days/7)} week${Math.floor(days/7)>1?"s":""} ago`;
    return `${Math.floor(days/30)} month${Math.floor(days/30)>1?"s":""} ago`;
  };

  const lastContactedLabel = (): string => {
    const latest = interactions[0];
    if (latest?.type === "call") return "Last talked";
    if (latest?.type === "message") return "Last texted";
    return "Last seen";
  };

  const formatOccurredOn = (dateStr: string) => {
    try {
      const d = new Date(dateStr + "T00:00:00");
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case "call":
        return (
          <svg className="w-4 h-4 text-[#C8A96E] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        );
      case "message":
        return (
          <svg className="w-4 h-4 text-[#C8A96E] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      case "event":
        return (
          <svg className="w-4 h-4 text-[#C8A96E] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case "hangout":
        return (
          <svg className="w-4 h-4 text-[#C8A96E] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-[#C8A96E] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
        );
    }
  };

  const saveNotes = async () => {
    if (!contact) return;
    setSavingNotes(true);
    await supabase.from("contacts").update({ notes }).eq("id", contact.id);
    setContact(prev => prev ? { ...prev, notes } : null);
    setEditingNotes(false);
    setSavingNotes(false);
  };

  const saveName = async () => {
    if (!contact || !nameInput.trim()) return;
    setSavingName(true);
    const trimmed = nameInput.trim();
    await supabase.from("contacts").update({ full_name: trimmed }).eq("id", contact.id);
    setContact(prev => prev ? { ...prev, full_name: trimmed } : null);
    setEditingName(false);
    setSavingName(false);
  };

  const savePhone = async () => {
    if (!contact) return;
    setSavingPhone(true);
    const trimmed = phone.trim() || null;
    await supabase.from("contacts").update({ phone: trimmed }).eq("id", contact.id);
    setContact(prev => prev ? { ...prev, phone: trimmed } : null);
    setEditingPhone(false);
    setSavingPhone(false);
  };

  const saveDob = async () => {
    if (!contact) return;
    setSavingDob(true);
    const trimmed = dobInput.trim() || null;
    await supabase.from("contacts").update({ dob: trimmed }).eq("id", contact.id);
    setContact(prev => prev ? { ...prev, dob: trimmed } : null);
    setEditingDob(false);
    setSavingDob(false);
  };

  const formatDob = (d: string | null) => {
    if (!d) return null;
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return d;
      return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    } catch {
      return d;
    }
  };

  const openLogModal = () => {
    setLogType(null);
    setLogDate(new Date().toISOString().split("T")[0]);
    setLogNotes("");
    setShowLogModal(true);
  };

  const logInteraction = async () => {
    if (!contact || !logType) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setLogSaving(true);
    const occurredOn = logDate;
    const note = logNotes.trim() || null;
    const { error: insertError } = await supabase.from("interactions").insert({
      user_id: session.user.id,
      contact_id: contact.id,
      type: logType,
      occurred_on: occurredOn,
      note,
    });
    if (insertError) {
      setLogSaving(false);
      console.error(insertError);
      return;
    }
    await supabase.from("contacts").update({ last_contacted: occurredOn }).eq("id", contact.id);
    setContact(prev => prev ? { ...prev, last_contacted: occurredOn } : null);
    setLogSaving(false);
    setLogShowSuccess(true);
    setTimeout(() => {
      setShowLogModal(false);
      setLogShowSuccess(false);
    }, 1000);
    refreshInteractionsAndLastContacted();
  };

  const refreshInteractionsAndLastContacted = async () => {
    if (!contact) return;
    const { data: list } = await supabase
      .from("interactions")
      .select("id, type, occurred_on, note")
      .eq("contact_id", contact.id)
      .order("occurred_on", { ascending: false });
    setInteractions((list ?? []) as Interaction[]);
    const mostRecent = list?.[0];
    const newLastContacted = mostRecent?.occurred_on ?? null;
    await supabase.from("contacts").update({ last_contacted: newLastContacted }).eq("id", contact.id);
    setContact(prev => prev ? { ...prev, last_contacted: newLastContacted } : null);
  };

  const startEditInteraction = (row: Interaction) => {
    if (!row.id) return;
    setEditingInteractionId(row.id);
    setEditInteractionType(row.type);
    setEditInteractionDate(row.occurred_on);
    setEditInteractionNote(row.note ?? "");
  };

  const cancelEditInteraction = () => {
    setEditingInteractionId(null);
  };

  const saveEditInteraction = async () => {
    if (!editingInteractionId || !contact) return;
    setSavingInteractionEdit(true);
    const note = editInteractionNote.trim() || null;
    const { error } = await supabase
      .from("interactions")
      .update({ type: editInteractionType, occurred_on: editInteractionDate, note })
      .eq("id", editingInteractionId);
    setSavingInteractionEdit(false);
    if (error) {
      console.error(error);
      return;
    }
    setEditingInteractionId(null);
    await refreshInteractionsAndLastContacted();
  };

  const confirmDeleteInteraction = (row: Interaction) => {
    if (!row.id) return;
    setConfirmDeleteInteractionId(row.id);
  };

  const cancelDeleteInteraction = () => {
    setConfirmDeleteInteractionId(null);
  };

  const executeDeleteInteraction = async () => {
    if (!confirmDeleteInteractionId || !contact) return;
    setDeletingInteractionId(confirmDeleteInteractionId);
    await supabase.from("interactions").delete().eq("id", confirmDeleteInteractionId);
    setConfirmDeleteInteractionId(null);
    setDeletingInteractionId(null);
    await refreshInteractionsAndLastContacted();
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
    <main className="min-h-screen bg-[#141210] text-[#F0E6D3] pb-24">
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
            onClick={saveName}
            disabled={savingName}
            className="text-sm font-semibold text-[#C8A96E] disabled:text-[#7A7068] transition-colors"
          >
            {savingName ? "Saving..." : "Save"}
          </button>
        ) : (
          <button onClick={() => router.push("/profile")} className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-[#C8A96E] text-[#141210] text-sm font-bold">
            {userAvatarUrl ? (
              <img src={userAvatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              (userDisplayName || "?")[0].toUpperCase()
            )}
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
          <div className="text-center w-full">
            {editMode && editingName ? (
              <div className="flex flex-col items-center gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") { setEditingName(false); setNameInput(contact.full_name); } }}
                  placeholder="Full name"
                  autoFocus
                  className="w-full max-w-xs font-serif text-2xl text-[#F0E6D3] bg-[#1C1916] border border-[#2E2924] rounded-xl px-4 py-2 text-center placeholder-[#7A7068] outline-none focus:border-[#C8A96E] transition-colors"
                />
                <div className="flex gap-2">
                  <button onClick={saveName} disabled={savingName || !nameInput.trim()}
                    className="px-4 py-2 bg-[#C8A96E] text-[#141210] rounded-lg text-sm font-semibold hover:bg-[#D4B87E] transition-colors disabled:opacity-50">
                    {savingName ? "Saving..." : "Save"}
                  </button>
                  <button onClick={() => { setEditingName(false); setNameInput(contact.full_name); }} disabled={savingName}
                    className="px-4 py-2 border border-[#2E2924] text-[#7A7068] rounded-lg text-sm hover:text-[#F0E6D3] transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center justify-center gap-2">
                  <div className="font-serif text-2xl text-[#F0E6D3]">{contact.full_name}</div>
                  {editMode && (
                    <button
                      onClick={() => { setEditingName(true); setNameInput(contact.full_name); }}
                      className="p-1.5 rounded-lg text-[#7A7068] hover:text-[#C8A96E] hover:bg-[#28211A] transition-colors"
                      aria-label="Edit name"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="text-sm text-[#7A7068]">{lastContactedLabel()} {getLastSeen(contact.last_contacted)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Log interaction button */}
        <button onClick={openLogModal}
          className="w-full py-3 border border-[#C8A96E] text-[#C8A96E] rounded-xl text-sm font-semibold hover:bg-[#28211A] transition-colors">
          Log a hangout
        </button>

        {/* Log interaction modal */}
        {showLogModal && (
          <>
            <div
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => !logSaving && !logShowSuccess && setShowLogModal(false)}
              aria-hidden
            />
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#1C1916] rounded-t-2xl border-t border-[#2E2924] shadow-2xl px-4 pt-5 pb-8 safe-area-pb">
              {logShowSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
                    <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-lg font-semibold text-emerald-400">Logged!</span>
                </div>
              ) : (
                <>
                  <div className="text-center font-serif text-lg text-[#C8A96E] mb-4">Log interaction</div>
                  <div className="mb-4">
                    <div className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold mb-2">Type</div>
                    <div className="flex flex-wrap gap-2">
                      {INTERACTION_TYPES.map(({ label, value }) => (
                        <button
                          key={value}
                          onClick={() => setLogType(value)}
                          className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                            logType === value
                              ? "border-[#C8A96E] text-[#C8A96E] bg-[#28211A]"
                              : "border-[#2E2924] text-[#7A7068] hover:border-[#C8A96E44]"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold mb-2 block">Date</label>
                    <input
                      type="date"
                      value={logDate}
                      onChange={e => setLogDate(e.target.value)}
                      className="w-full bg-[#231F1B] border border-[#2E2924] rounded-xl px-4 py-3 text-sm text-[#F0E6D3] outline-none focus:border-[#C8A96E] transition-colors"
                    />
                  </div>
                  <div className="mb-6">
                    <label className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold mb-2 block">Note (optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. watched the Rockets game"
                      value={logNotes}
                      onChange={e => setLogNotes(e.target.value)}
                      className="w-full bg-[#231F1B] border border-[#2E2924] rounded-xl px-4 py-3 text-sm text-[#F0E6D3] placeholder-[#7A7068] outline-none focus:border-[#C8A96E] transition-colors"
                    />
                  </div>
                  <button
                    onClick={logInteraction}
                    disabled={!logType || logSaving}
                    className="w-full py-4 bg-[#C8A96E] text-[#141210] rounded-xl font-semibold text-sm hover:bg-[#D4B87E] transition-colors disabled:bg-[#2E2924] disabled:text-[#7A7068] disabled:cursor-not-allowed"
                  >
                    {logSaving ? "Logging..." : "Log it"}
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {/* Groups */}
        <div className="bg-[#1C1916] border border-[#2E2924] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold">Groups</div>
            {!editingGroups && (
              <button onClick={() => { setEditGroups(contact.groups ? [...contact.groups] : []); setEditingGroups(true); setGroupInput(""); }} className="text-xs text-[#C8A96E] hover:text-[#D4B87E] transition-colors">
                Edit
              </button>
            )}
          </div>
          {editingGroups ? (
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
              {allGroups.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {allGroups.map(g => {
                    const selected = editGroups.some(eg => eg.toLowerCase() === g.toLowerCase());
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => {
                          const inList = editGroups.find(eg => eg.toLowerCase() === g.toLowerCase());
                          if (inList) removeEditGroup(inList);
                          else addEditGroup(g);
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all capitalize ${
                          selected
                            ? "border-[#C8A96E] text-[#C8A96E] bg-[#28211A]"
                            : "border-[#2E2924] text-[#7A7068] hover:border-[#C8A96E44] hover:text-[#C8A96E]"
                        }`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <button onClick={saveGroups} disabled={savingGroups}
                  className="flex-1 py-2 bg-[#C8A96E] text-[#141210] rounded-lg text-sm font-semibold hover:bg-[#D4B87E] transition-colors disabled:opacity-60">
                  {savingGroups ? "Saving..." : "Save"}
                </button>
                <button onClick={() => { setEditingGroups(false); setGroupInput(""); }} disabled={savingGroups}
                  className="flex-1 py-2 border border-[#2E2924] text-[#7A7068] rounded-lg text-sm hover:text-[#F0E6D3] transition-colors">
                  Cancel
                </button>
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
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold">Interests</div>
            {!editingInterests && (
              <button onClick={() => { setEditInterests(contact.interests ? [...contact.interests] : []); setEditingInterests(true); setInterestInput(""); }} className="text-xs text-[#C8A96E] hover:text-[#D4B87E] transition-colors">
                Edit
              </button>
            )}
          </div>
          {editingInterests ? (
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
              {allInterests.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {allInterests.map(i => {
                    const selected = editInterests.some(ei => ei.toLowerCase() === i.toLowerCase());
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          const inList = editInterests.find(ei => ei.toLowerCase() === i.toLowerCase());
                          if (inList) removeEditInterest(inList);
                          else addEditInterest(i);
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all capitalize ${
                          selected
                            ? "border-[#C8A96E] text-[#C8A96E] bg-[#28211A]"
                            : "border-[#2E2924] text-[#7A7068] hover:border-[#C8A96E44] hover:text-[#C8A96E]"
                        }`}
                      >
                        {i}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <button onClick={saveInterests} disabled={savingInterests}
                  className="flex-1 py-2 bg-[#C8A96E] text-[#141210] rounded-lg text-sm font-semibold hover:bg-[#D4B87E] transition-colors disabled:opacity-60">
                  {savingInterests ? "Saving..." : "Save"}
                </button>
                <button onClick={() => { setEditingInterests(false); setInterestInput(""); }} disabled={savingInterests}
                  className="flex-1 py-2 border border-[#2E2924] text-[#7A7068] rounded-lg text-sm hover:text-[#F0E6D3] transition-colors">
                  Cancel
                </button>
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

        {/* Phone */}
        <div className="bg-[#1C1916] border border-[#2E2924] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold">Phone</div>
            {!editingPhone && (
              <button onClick={() => { setEditingPhone(true); setPhone(contact.phone || ""); }} className="text-xs text-[#C8A96E] hover:text-[#D4B87E] transition-colors">
                {contact.phone ? "Edit" : "Add"}
              </button>
            )}
          </div>
          {editingPhone ? (
            <div className="flex flex-col gap-2">
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Phone number"
                className="w-full bg-[#231F1B] border border-[#2E2924] rounded-lg px-3 py-2 text-sm text-[#F0E6D3] placeholder-[#7A7068] outline-none focus:border-[#C8A96E] transition-colors"
              />
              <div className="flex gap-2">
                <button onClick={savePhone} disabled={savingPhone}
                  className="flex-1 py-2 bg-[#C8A96E] text-[#141210] rounded-lg text-sm font-semibold hover:bg-[#D4B87E] transition-colors">
                  {savingPhone ? "Saving..." : "Save"}
                </button>
                <button onClick={() => { setEditingPhone(false); setPhone(contact.phone || ""); }} disabled={savingPhone}
                  className="flex-1 py-2 border border-[#2E2924] text-[#7A7068] rounded-lg text-sm hover:text-[#F0E6D3] transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm">
              {contact.phone ? (
                <a href={`tel:${contact.phone}`} className="text-[#C8A96E] hover:text-[#D4B87E] transition-colors">
                  {contact.phone}
                </a>
              ) : (
                <span className="text-[#7A7068]">No phone</span>
              )}
            </div>
          )}
        </div>

        {/* Date of birth */}
        <div className="bg-[#1C1916] border border-[#2E2924] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold">Date of birth</div>
            {!editingDob && (
              <button onClick={() => { setEditingDob(true); setDobInput(contact.dob ? String(contact.dob) : ""); }} className="text-xs text-[#C8A96E] hover:text-[#D4B87E] transition-colors">
                {contact.dob ? "Edit" : "Add"}
              </button>
            )}
          </div>
          {editingDob ? (
            <div className="flex flex-col gap-2">
              <input
                type="date"
                value={dobInput}
                onChange={e => setDobInput(e.target.value)}
                className="w-full bg-[#231F1B] border border-[#2E2924] rounded-lg px-3 py-2 text-sm text-[#F0E6D3] outline-none focus:border-[#C8A96E] transition-colors"
              />
              <div className="flex gap-2">
                <button onClick={saveDob} disabled={savingDob}
                  className="flex-1 py-2 bg-[#C8A96E] text-[#141210] rounded-lg text-sm font-semibold hover:bg-[#D4B87E] transition-colors">
                  {savingDob ? "Saving..." : "Save"}
                </button>
                <button onClick={() => { setEditingDob(false); setDobInput(contact.dob ? String(contact.dob) : ""); }} disabled={savingDob}
                  className="flex-1 py-2 border border-[#2E2924] text-[#7A7068] rounded-lg text-sm hover:text-[#F0E6D3] transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm">
              {contact.dob ? (
                <span className="text-[#F0E6D3]">{formatDob(contact.dob)}</span>
              ) : (
                <span className="text-[#7A7068]">No date of birth</span>
              )}
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

        {/* Interactions history */}
        <div className="bg-[#1C1916] border border-[#2E2924] rounded-2xl p-4">
          <div className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold mb-3">Interactions</div>
          {interactions.length === 0 ? (
            <div className="text-sm text-[#7A7068]">No interactions yet. Log one above.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {interactions.slice(0, interactionsShown).map((row, idx) => (
                <div key={row.id ?? `${row.occurred_on}-${row.type}-${idx}`} className="border-b border-[#2E2924] last:border-0 last:pb-0 first:pt-0 py-2">
                  {confirmDeleteInteractionId === row.id ? (
                    <div className="flex flex-col gap-2 py-1">
                      <div className="text-sm text-[#F0E6D3]">Are you sure?</div>
                      <div className="flex gap-2">
                        <button
                          onClick={executeDeleteInteraction}
                          disabled={!!deletingInteractionId}
                          className="flex-1 py-2 bg-[#8B4545] text-white rounded-lg text-xs font-semibold hover:bg-[#A05555] transition-colors disabled:opacity-60"
                        >
                          {deletingInteractionId === row.id ? "Deleting..." : "Delete"}
                        </button>
                        <button
                          onClick={cancelDeleteInteraction}
                          disabled={!!deletingInteractionId}
                          className="flex-1 py-2 border border-[#2E2924] text-[#7A7068] rounded-lg text-xs hover:text-[#F0E6D3] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : editingInteractionId === row.id ? (
                    <div className="flex flex-col gap-3 py-1">
                      <div className="flex flex-wrap gap-2">
                        {INTERACTION_TYPES.map(({ label, value }) => (
                          <button
                            key={value}
                            onClick={() => setEditInteractionType(value)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                              editInteractionType === value
                                ? "border-[#C8A96E] text-[#C8A96E] bg-[#28211A]"
                                : "border-[#2E2924] text-[#7A7068] hover:border-[#C8A96E44]"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <input
                        type="date"
                        value={editInteractionDate}
                        onChange={e => setEditInteractionDate(e.target.value)}
                        className="w-full bg-[#231F1B] border border-[#2E2924] rounded-lg px-3 py-2 text-sm text-[#F0E6D3] outline-none focus:border-[#C8A96E] transition-colors"
                      />
                      <input
                        type="text"
                        placeholder="Note (optional)"
                        value={editInteractionNote}
                        onChange={e => setEditInteractionNote(e.target.value)}
                        className="w-full bg-[#231F1B] border border-[#2E2924] rounded-lg px-3 py-2 text-sm text-[#F0E6D3] placeholder-[#7A7068] outline-none focus:border-[#C8A96E] transition-colors"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={saveEditInteraction}
                          disabled={savingInteractionEdit}
                          className="flex-1 py-2 bg-[#C8A96E] text-[#141210] rounded-lg text-xs font-semibold hover:bg-[#D4B87E] transition-colors disabled:opacity-60"
                        >
                          {savingInteractionEdit ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={cancelEditInteraction}
                          disabled={savingInteractionEdit}
                          className="flex-1 py-2 border border-[#2E2924] text-[#7A7068] rounded-lg text-xs hover:text-[#F0E6D3] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#28211A] border border-[#2E2924] flex-shrink-0">
                        {getInteractionIcon(row.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-[#F0E6D3]">{formatOccurredOn(row.occurred_on)}</div>
                        {row.note && <div className="text-xs text-[#7A7068] truncate">{row.note}</div>}
                      </div>
                      {row.id && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => startEditInteraction(row)}
                            className="px-2 py-1 text-xs text-[#C8A96E] hover:bg-[#28211A] rounded transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => confirmDeleteInteraction(row)}
                            className="px-2 py-1 text-xs text-[#A67A7A] hover:bg-[#2E2222] rounded transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {interactions.length > interactionsShown && (
                <button
                  onClick={() => setInteractionsShown(prev => Math.min(prev + INTERACTIONS_PAGE_SIZE, interactions.length))}
                  className="py-2 text-sm text-[#C8A96E] hover:text-[#D4B87E] font-medium transition-colors"
                >
                  Load more
                </button>
              )}
            </div>
          )}
        </div>

        {/* Added date */}
        <div className="text-center text-xs text-[#3A3530]">
          Added {new Date(contact.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </div>

        {/* Edit button */}
        {!editMode ? (
          <button
            onClick={startEditMode}
            className="w-full py-3 border border-[#C8A96E] text-[#C8A96E] rounded-xl text-sm font-semibold hover:bg-[#C8A96E22] transition-colors"
          >
            Edit
          </button>
        ) : null}

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

      <BottomNav />
    </main>
  );
}
