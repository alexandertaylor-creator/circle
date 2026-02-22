"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { BottomNav } from "@/components/BottomNav";

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
  const searchParams = useSearchParams();
  const [members, setMembers] = useState<Contact[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [groupPhoto, setGroupPhoto] = useState("");
  const [userAvatarUrl, setUserAvatarUrl] = useState("");
  const [userDisplayName, setUserDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editGroupNameInput, setEditGroupNameInput] = useState("");
  const [savingRename, setSavingRename] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchParams.get("adding") === "1") {
      setAdding(true);
      setEditGroupNameInput(groupName);
    }
  }, [searchParams, groupName]);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/auth"); return; }
      const [{ data: profile }, { data: groupRow }, { data: contactsData }] = await Promise.all([
        supabase.from("profiles").select("avatar_url, display_name").eq("id", session.user.id).single(),
        supabase.from("groups").select("photo_url").eq("user_id", session.user.id).eq("name", groupName).maybeSingle(),
        supabase.from("contacts").select("id, full_name, last_contacted, groups, interests").order("full_name").limit(1000),
      ]);
      if (profile?.avatar_url) setUserAvatarUrl(profile.avatar_url);
      if (profile?.display_name) setUserDisplayName(profile.display_name);
      if (groupRow?.photo_url) setGroupPhoto(groupRow.photo_url);
      if (contactsData) {
        setAllContacts(contactsData);
        setMembers(contactsData.filter(c => (c.groups || []).includes(groupName)));
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
    if (days < 30) return `${Math.floor(days/7)}w ago`;
    return `${Math.floor(days/30)}mo ago`;
  };

  const handleGroupPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log("[Group photo] No file selected");
      return;
    }
    e.target.value = "";
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log("[Group photo] No session");
      return;
    }
    setUploadingPhoto(true);
    console.log("[Group photo] Starting upload, file:", file.name, "size:", file.size);

    const path = "group/" + groupName.replace(/\s+/g, "_") + "_" + Date.now() + ".jpg";
    console.log("[Group photo] Upload path:", path);

    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) {
      console.error("[Group photo] Upload error:", uploadError);
      setUploadingPhoto(false);
      return;
    }
    console.log("[Group photo] Upload success");

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = urlData.publicUrl;
    console.log("[Group photo] Public URL:", publicUrl);

    const { error: upsertError } = await supabase.from("groups").upsert(
      { user_id: session.user.id, name: groupName, photo_url: publicUrl },
      { onConflict: "user_id,name" }
    );
    if (upsertError) {
      console.error("[Group photo] Groups upsert error:", upsertError);
      setUploadingPhoto(false);
      return;
    }
    console.log("[Group photo] Groups upsert success");

    setGroupPhoto(publicUrl);
    setUploadingPhoto(false);
    console.log("[Group photo] Done");
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

  const handleEditToggle = () => {
    if (!adding) {
      setEditGroupNameInput(groupName);
    }
    setAdding(!adding);
  };

  const handleDoneSave = async () => {
    const newName = editGroupNameInput.trim();
    if (!newName || newName === groupName) {
      setAdding(false);
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setSavingRename(true);
    for (const c of allContacts) {
      if ((c.groups || []).includes(groupName)) {
        const newGroups = (c.groups || []).map(g => g === groupName ? newName : g);
        await supabase.from("contacts").update({ groups: newGroups }).eq("id", c.id);
      }
    }
    await supabase.from("groups").upsert(
      { user_id: session.user.id, name: newName, photo_url: groupPhoto || null },
      { onConflict: "user_id,name" }
    );
    await supabase.from("groups").delete().eq("user_id", session.user.id).eq("name", groupName);
    setSavingRename(false);
    setAdding(false);
    router.push("/groups/" + encodeURIComponent(newName));
  };

  const handleDeleteGroup = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setDeleting(true);
    for (const c of allContacts) {
      if ((c.groups || []).includes(groupName)) {
        const newGroups = (c.groups || []).filter(g => g !== groupName);
        await supabase.from("contacts").update({ groups: newGroups }).eq("id", c.id);
      }
    }
    await supabase.from("groups").delete().eq("user_id", session.user.id).eq("name", groupName);
    setDeleting(false);
    setShowDeleteConfirm(false);
    router.push("/groups");
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
        {adding ? (
          <input
            type="text"
            value={editGroupNameInput}
            onChange={e => setEditGroupNameInput(e.target.value)}
            className="font-serif italic text-[#C8A96E] text-lg bg-transparent border-b border-[#C8A96E44] outline-none focus:border-[#C8A96E] px-1 py-0.5 min-w-0 max-w-[180px] capitalize placeholder-[#7A7068]"
            placeholder="Group name"
          />
        ) : (
          <span className="font-serif italic text-[#C8A96E] text-lg capitalize">{groupName}</span>
        )}
        <button onClick={() => router.push("/profile")} className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-[#C8A96E] text-[#141210] text-sm font-bold">
            {userAvatarUrl ? (
              <img src={userAvatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              (userDisplayName || "?")[0].toUpperCase()
            )}
          </button>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">

        <button
          onClick={adding ? handleDoneSave : handleEditToggle}
          disabled={adding && savingRename}
          className={"w-full py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 " + (adding ? "bg-[#C8A96E] text-[#141210] hover:bg-[#D4B87E]" : "border border-[#C8A96E] text-[#C8A96E] hover:bg-[#C8A96E22]")}
        >
          {adding ? (savingRename ? "Saving..." : "Done") : "Edit"}
        </button>

        {/* Group avatar with photo upload */}
        <div className="flex justify-center pb-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleGroupPhotoSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="relative w-24 h-24 rounded-full flex items-center justify-center overflow-hidden border-2 border-[#2E2924] hover:border-[#C8A96E44] transition-colors disabled:opacity-70 flex-shrink-0 bg-[#28211A]"
          >
            {uploadingPhoto ? (
              <div className="absolute inset-0 flex items-center justify-center bg-[#141210]/80">
                <span className="text-[#C8A96E] text-sm">...</span>
              </div>
            ) : groupPhoto ? (
              <img src={groupPhoto} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[#C8A96E] text-3xl font-semibold">
                {groupName.charAt(0).toUpperCase()}
              </span>
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
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-[#7A7068] uppercase tracking-widest font-semibold">
            {members.length} {members.length === 1 ? "person" : "people"}
          </div>
          <button onClick={() => router.push("/plan?group=" + encodeURIComponent(groupName))}
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
              {nonMembers.map(contact => (
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

        {adding && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="mt-6 w-full py-3 rounded-xl font-semibold text-sm border border-red-900/60 text-red-400/90 hover:bg-red-900/20 hover:text-red-300 transition-colors"
          >
            Delete group
          </button>
        )}
      </div>

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}
        >
          <div
            className="w-full max-w-sm bg-[#1C1916] border border-[#2E2924] rounded-2xl shadow-lg p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-[#F0E6D3] mb-4">
              This will remove this group tag from all members. Are you sure?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 border border-[#2E2924] text-[#7A7068] rounded-lg text-sm hover:text-[#F0E6D3] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteGroup}
                disabled={deleting}
                className="flex-1 py-2 bg-red-900/60 text-red-200 rounded-lg text-sm font-semibold hover:bg-red-900/80 transition-colors disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
