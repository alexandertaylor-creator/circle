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
        {(suggestions.length > 0 || (value.trim() && !allTags.includes(value.trim().toLowerCase()))) && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#231F1B] border border-[#2E2924] rounded-lg overflow-hidden z-20">
            {suggestions.map(s => (
              <button key={s} onClick={() => addTag(s)}
                className="w-full text-left px-3 py-2 text-sm text-[#F0E6D3] hover:bg-[#28211A] transition-colors">
                {s}
              </button>
            ))}
            {value.trim() && !allTags.includes(value.trim().toLowerCase()) && (
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
  const [name, setName] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState("");
  const [groupInput, setGroupInput] = useState("");
  const [interestSuggestions, setInterestSuggestions] = useState<string[]>([]);
  const [groupSuggestions, setGroupSuggestions] = useState<string[]>([]);
  const [allInterests, setAllInterests] = useState<string[]>([]);
  const [allGroups, setAllGroups] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        setChecking(false);
        loadExisting();
      } else {
        router.push("/auth");
      }
    });
  }, [router]);

  const loadExisting = async () => {
    const { data } = await supabase.from("contacts").select("interests, groups");
    if (data) {
      const allI = Array.from(new Set(data.flatMap(c => c.interests || []))).sort();
      const allG = Array.from(new Set(data.flatMap(c => c.groups || []))).sort();
      setAllInterests(allI);
      setAllGroups(allG);
    }
  };

  useEffect(() => {
    if (!interestInput.trim()) { setInterestSuggestions([]); return; }
    setInterestSuggestions(allInterests.filter(t =>
      t.toLowerCase().includes(interestInput.toLowerCase()) && !interests.includes(t)
    ));
  }, [interestInput, allInterests, interests]);

  useEffect(() => {
    if (!groupInput.trim()) { setGroupSuggestions([]); return; }
    setGroupSuggestions(allGroups.filter(t =>
      t.toLowerCase().includes(groupInput.toLowerCase()) && !groups.includes(t)
    ));
  }, [groupInput, allGroups, groups]);

  const addInterest = (val: string) => {
    const clean = val.trim().toLowerCase();
    if (!clean || interests.includes(clean)) return;
    setInterests(prev => [...prev, clean]);
    setInterestInput("");
    setInterestSuggestions([]);
  };

  const addGroup = (val: string) => {
    const clean = val.trim().toLowerCase();
    if (!clean || groups.includes(clean)) return;
    setGroups(prev => [...prev, clean]);
    setGroupInput("");
    setGroupSuggestions([]);
  };

  const handleSave = async () => {
    if (!name.trim() || !userId) return;
    setLoading(true);
    const { error } = await supabase.from("contacts").insert({
      user_id: userId,
      full_name: name,
      interests,
      groups,
      fields: {},
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
      <div className="font-serif text-2xl text-[#F0E6D3]">{name} added.</div>
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
        <button onClick={handleSave} disabled={!name.trim() || loading} className="text-sm font-semibold text-[#C8A96E] disabled:text-[#7A7068] transition-colors">
          {loading ? "Saving..." : "Save"}
        </button>
      </header>
      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">
        <input
          type="text"
          placeholder="Full name"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
          className="w-full bg-[#1C1916] border border-[#2E2924] rounded-xl px-4 py-3 text-base text-[#F0E6D3] placeholder-[#7A7068] outline-none focus:border-[#C8A96E] transition-colors font-medium"
        />
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
        <button onClick={handleSave} disabled={!name.trim() || loading}
          className="w-full py-4 bg-[#C8A96E] text-[#141210] rounded-xl font-semibold text-sm hover:bg-[#D4B87E] transition-colors disabled:bg-[#2E2924] disabled:text-[#7A7068]">
          {loading ? "Saving..." : "Save friend"}
        </button>
      </div>
    </main>
  );
}
