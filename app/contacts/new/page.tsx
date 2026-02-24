"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function TagInput({
  label,
  placeholder,
  value,
  setValue,
  tags,
  addTag,
  removeTag,
  suggestions,
  allTags,
}: {
  label: string;
  placeholder: string;
  value: string;
  setValue: (v: string) => void;
  tags: string[];
  addTag: (v: string) => void;
  removeTag: (v: string) => void;
  suggestions: string[];
  allTags: string[];
}) {
  return (
    <div className="bg-[#1C1916] border border-[#2E2924] rounded-2xl p-4">
      <div className="text-xs text-[#7A7068] mb-3 font-medium">{label}</div>
      <div className="flex flex-wrap gap-2 mb-3">
        {tags.map(tag => (
          <span key={tag} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#28211A] border border-[#C8A96E44] text-[#C8A96E] text-xs">
            {tag}
            <button onClick={() => removeTag(tag)} className="text-[#C8A96E] hover:text-white transition-colors leading-none">x</button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(value); }
          }}
          className="w-full bg-[#231F1B] border border-[#2E2924] rounded-lg px-3 py-2 text-sm text-[#F0E6D3] placeholder-[#7A7068] outline-none focus:border-[#C8A96E] transition-colors"
        />
        {(suggestions.length > 0 || (value.trim() && !allTags.some(t => t.toLowerCase() === value.trim().toLowerCase()))) && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#231F1B] border border-[#2E2924] rounded-lg overflow-hidden z-20">
            {suggestions.map(s => (
              <button key={s} onClick={() => addTag(s)}
                className="w-full text-left px-3 py-2 text-sm text-[#F0E6D3] hover:bg-[#28211A] transition-colors">
                {s}
              </button>
            ))}
            {value.trim() && !allTags.some(t => t.toLowerCase() === value.trim().toLowerCase()) && (
              <button onClick={() => addTag(value)}
                className="w-full text-left px-3 py-2 text-sm text-[#C8A96E] hover:bg-[#28211A] transition-colors border-t border-[#2E2924]">
                + Create "{value.trim()}"
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function NewContactPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState("");
  const [groupInput, setGroupInput] = useState("");
  const [interestSuggestions, setInterestSuggestions] = useState<string[]>([]);
  const [groupSuggestions, setGroupSuggestions] = useState<string[]>([]);
  const [allInterests, setAllInterests] = useState<string[]>([]);
  const [allGroups, setAllGroups] = useState<string[]>([]);
  const [userAvatarUrl, setUserAvatarUrl] = useState("");
  const [userDisplayName, setUserDisplayName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [existingContacts, setExistingContacts] = useState<{ id: string; full_name: string }[]>([]);
  const [duplicateContact, setDuplicateContact] = useState<{ id: string; full_name: string } | null>(null);
  const [dismissedDuplicateWarning, setDismissedDuplicateWarning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        setChecking(false);
        const { data: profile } = await supabase
          .from("profiles")
          .select("avatar_url, display_name")
          .eq("id", session.user.id)
          .single();
        if (profile?.avatar_url) setUserAvatarUrl(profile.avatar_url);
        if (profile?.display_name) setUserDisplayName(profile.display_name);
        loadExisting();
      } else {
        router.push("/auth");
      }
    });
  }, [router]);

  const loadExisting = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const [{ data: contactsData }, { data: profileData }] = await Promise.all([
      supabase.from("contacts").select("id, full_name, interests, groups").limit(1000),
      session ? supabase.from("profiles").select("interests").eq("id", session.user.id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    if (contactsData) {
      setExistingContacts(contactsData.map(c => ({ id: c.id, full_name: c.full_name || "" })));
      const fromContacts = contactsData.flatMap(c => c.interests || []);
      const fromProfiles = (Array.isArray(profileData?.interests) ? profileData.interests : []) as string[];
      setAllInterests(Array.from(new Set([...fromContacts, ...fromProfiles])).sort());
      setAllGroups(Array.from(new Set(contactsData.flatMap(c => c.groups || []))).sort());
    } else if (Array.isArray(profileData?.interests) && profileData.interests.length > 0) {
      setAllInterests(Array.from(new Set(profileData.interests as string[])).sort());
    }
  };

  useEffect(() => {
    if (!interestInput.trim()) { setInterestSuggestions([]); return; }
    setInterestSuggestions(allInterests.filter(t => {
      const lower = t.toLowerCase();
      return (
        lower.includes(interestInput.toLowerCase()) &&
        !interests.some(i => i.toLowerCase() === lower)
      );
    }));
  }, [interestInput, allInterests, interests]);

  useEffect(() => {
    if (!groupInput.trim()) { setGroupSuggestions([]); return; }
    setGroupSuggestions(allGroups.filter(t => {
      const lower = t.toLowerCase();
      return (
        lower.includes(groupInput.toLowerCase()) &&
        !groups.some(g => g.toLowerCase() === lower)
      );
    }));
  }, [groupInput, allGroups, groups]);

  const fullNameForCheck = (firstName.trim() + " " + lastName.trim()).trim();
  useEffect(() => {
    setDismissedDuplicateWarning(false);
    if (!fullNameForCheck) {
      setDuplicateContact(null);
      return;
    }
    const key = fullNameForCheck.toLowerCase();
    const match = existingContacts.find(
      c => (c.full_name || "").trim().toLowerCase() === key
    );
    setDuplicateContact(match ?? null);
  }, [fullNameForCheck, existingContacts]);

  const addInterest = (val: string) => {
    const clean = val.trim();
    if (!clean) return;
    const lower = clean.toLowerCase();
    if (interests.some(i => i.toLowerCase() === lower)) return;
    setInterests(prev => [...prev, clean]);
    setInterestInput("");
    setInterestSuggestions([]);
  };

  const addGroup = (val: string) => {
    const clean = val.trim();
    if (!clean) return;
    const lower = clean.toLowerCase();
    if (groups.some(g => g.toLowerCase() === lower)) return;
    setGroups(prev => [...prev, clean]);
    setGroupInput("");
    setGroupSuggestions([]);
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    e.target.value = "";
    setUploadingPhoto(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) {
      setUploadingPhoto(false);
      console.error(uploadError);
      return;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    setPhotoUrl(urlData.publicUrl);
    setUploadingPhoto(false);
  };

  const formatPhoneDisplay = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits ? `(${digits}` : "";
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhoneDisplay(e.target.value));
  };

  const handleSave = async () => {
    const fullName = (firstName.trim() + " " + lastName.trim()).trim();
    if (!fullName || !userId) return;
    setLoading(true);
    const phoneDigits = phone.replace(/\D/g, "").trim();
    const { error } = await supabase.from("contacts").insert({
      user_id: userId,
      full_name: fullName,
      photo_url: photoUrl || null,
      dob: dob || null,
      phone: phoneDigits || null,
      notes: notes.trim() || null,
      interests,
      groups,
    });
    if (!error) {
      setSaved(true);
      setTimeout(() => router.push("/dashboard"), 1500);
    } else {
      alert("Something went wrong. Try again.");
      console.error(error);
    }
    setLoading(false);
  };

  if (checking) return (
    <main className="min-h-screen bg-[#141210] flex items-center justify-center">
      <div className="text-[#7A7068] text-sm">Loading...</div>
    </main>
  );

  if (saved) return (
    <main className="min-h-screen bg-[#141210] flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 rounded-full border-2 border-[#C8A96E] bg-[#C8A96E22] flex items-center justify-center text-2xl">v</div>
      <div className="font-serif text-2xl text-[#F0E6D3]">{(firstName.trim() + " " + lastName.trim()).trim()} added.</div>
      <div className="text-sm text-[#7A7068]">Heading back to your people...</div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#141210] text-[#F0E6D3]">
      <header className="flex items-center justify-between px-6 py-5 border-b border-[#2E2924] sticky top-0 bg-[#141210] z-10">
        <button onClick={() => router.push("/dashboard")} className="text-sm text-[#7A7068] hover:text-[#F0E6D3] transition-colors">
          Cancel
        </button>
        <span className="font-serif italic text-[#C8A96E] text-lg">Add friend</span>
        <button onClick={() => router.push("/profile")} className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-[#C8A96E] text-[#141210] text-sm font-bold">
          {userAvatarUrl ? (
            <img src={userAvatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            (userDisplayName || "?")[0].toUpperCase()
          )}
        </button>
      </header>
      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">
        {/* Contact photo upload */}
        <div className="flex justify-center pb-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="relative w-28 h-28 rounded-full flex items-center justify-center overflow-hidden border-2 border-[#2E2924] hover:border-[#C8A96E44] transition-colors disabled:opacity-70 bg-[#1C1916] flex-shrink-0"
          >
            {uploadingPhoto ? (
              <div className="absolute inset-0 flex items-center justify-center bg-[#141210]/80">
                <span className="text-[#C8A96E] text-sm">...</span>
              </div>
            ) : photoUrl ? (
              <img src={photoUrl} alt="" className="w-full h-full object-cover" />
            ) : null}
            {!uploadingPhoto && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-[#141210]/90 border border-[#2E2924] flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#C8A96E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 13v4a2 2 0 01-2 2H7a2 2 0 01-2-2v-4M14 12v.01" />
                  </svg>
                </div>
              </div>
            )}
          </button>
        </div>
        <div>
          <label className="text-xs text-[#7A7068] mb-2 block font-medium">First name</label>
          <input
            type="text"
            placeholder="e.g. Alex"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            autoFocus
            className="w-full bg-[#1C1916] border border-[#2E2924] rounded-xl px-4 py-3 text-base text-[#F0E6D3] placeholder-[#7A7068] outline-none focus:border-[#C8A96E] transition-colors font-medium"
          />
        </div>
        <div>
          <label className="text-xs text-[#7A7068] mb-2 block font-medium">Last name</label>
          <input
            type="text"
            placeholder="e.g. Smith"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            className="w-full bg-[#1C1916] border border-[#2E2924] rounded-xl px-4 py-3 text-base text-[#F0E6D3] placeholder-[#7A7068] outline-none focus:border-[#C8A96E] transition-colors font-medium"
          />
        </div>
        {duplicateContact && !dismissedDuplicateWarning && (
          <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4">
            <p className="text-sm text-amber-200 mb-3">
              A contact named <span className="font-medium text-amber-100">{duplicateContact.full_name}</span> already exists. Are you sure you want to add them?
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDismissedDuplicateWarning(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/30 border border-amber-500/50 text-amber-200 hover:bg-amber-500/40 transition-colors"
              >
                Yes, add anyway
              </button>
              <button
                type="button"
                onClick={() => router.push(`/contacts/${duplicateContact.id}`)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#C8A96E] text-[#C8A96E] hover:bg-[#28211A] transition-colors"
              >
                View existing contact
              </button>
            </div>
          </div>
        )}
        <TagInput
          label="Interests"
          placeholder='e.g. padel, rockets, golf...'
          value={interestInput}
          setValue={setInterestInput}
          tags={interests}
          addTag={addInterest}
          removeTag={(tag) => setInterests(prev => prev.filter(t => t !== tag))}
          suggestions={interestSuggestions}
          allTags={allInterests}
        />
        {allInterests.length > 0 && (
          <div className="mb-1">
            <div className="text-xs text-[#7A7068] mb-2 font-medium">Existing interests</div>
            <div className="flex flex-wrap gap-2">
              {allInterests.map(tag => {
                const selected = interests.some(i => i.toLowerCase() === tag.toLowerCase());
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => { if (!selected) addInterest(tag); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      selected
                        ? "border-[#C8A96E] text-[#C8A96E] bg-[#28211A]"
                        : "border-[#2E2924] text-[#7A7068] hover:border-[#C8A96E44] hover:text-[#C8A96E]"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <TagInput
          label="Groups"
          placeholder='e.g. the boys, work friends, college crew...'
          value={groupInput}
          setValue={setGroupInput}
          tags={groups}
          addTag={addGroup}
          removeTag={(tag) => setGroups(prev => prev.filter(t => t !== tag))}
          suggestions={groupSuggestions}
          allTags={allGroups}
        />
        {allGroups.length > 0 && (
          <div className="mb-1">
            <div className="text-xs text-[#7A7068] mb-2 font-medium">Existing groups</div>
            <div className="flex flex-wrap gap-2">
              {allGroups.map(tag => {
                const selected = groups.some(g => g.toLowerCase() === tag.toLowerCase());
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => { if (!selected) addGroup(tag); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      selected
                        ? "border-[#C8A96E] text-[#C8A96E] bg-[#28211A]"
                        : "border-[#2E2924] text-[#7A7068] hover:border-[#C8A96E44] hover:text-[#C8A96E]"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div>
          <label className="text-xs text-[#7A7068] mb-2 block font-medium">Notes</label>
          <textarea
            placeholder="Any notes about this person..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className="w-full bg-[#1C1916] border border-[#2E2924] rounded-xl px-4 py-3 text-sm text-[#F0E6D3] placeholder-[#7A7068] outline-none focus:border-[#C8A96E] transition-colors resize-none"
          />
        </div>
        <div>
          <label className="text-xs text-[#7A7068] mb-2 block font-medium">Date of birth</label>
          <input
            type="date"
            value={dob}
            onChange={e => setDob(e.target.value)}
            className="w-full bg-[#1C1916] border border-[#2E2924] rounded-xl px-4 py-3 text-sm text-[#F0E6D3] outline-none focus:border-[#C8A96E] transition-colors"
          />
        </div>
        <div>
          <label className="text-xs text-[#7A7068] mb-2 block font-medium">Phone number</label>
          <input
            type="tel"
            placeholder="(555) 123-4567"
            value={phone}
            onChange={handlePhoneChange}
            maxLength={14}
            className="w-full bg-[#1C1916] border border-[#2E2924] rounded-xl px-4 py-3 text-sm text-[#F0E6D3] placeholder-[#7A7068] outline-none focus:border-[#C8A96E] transition-colors"
          />
        </div>
        <button onClick={handleSave} disabled={!firstName.trim() || loading}
          className="w-full py-4 bg-[#C8A96E] text-[#141210] rounded-xl font-semibold text-sm hover:bg-[#D4B87E] transition-colors disabled:bg-[#2E2924] disabled:text-[#7A7068]">
          {loading ? "Saving..." : "Save friend"}
        </button>
      </div>
    </main>
  );
}
