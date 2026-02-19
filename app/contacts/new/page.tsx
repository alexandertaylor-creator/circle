"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Field = {
  name: string;
  type: string;
  value: string | boolean | string[] | null;
  options?: string[];
};

const DEFAULT_FIELDS: Field[] = [
  { name: "Plays padel", type: "bool", value: null },
  { name: "Sports interests", type: "multi", value: [], options: ["Padel","Tennis","Golf","Basketball","Running"] },
  { name: "Alma mater", type: "text", value: "" },
  { name: "Dietary restriction", type: "select", value: null, options: ["None","Vegetarian","Vegan","Kosher","Halal"] },
];

export default function NewContactPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [fields, setFields] = useState<Field[]>(DEFAULT_FIELDS);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        setChecking(false);
      } else {
        router.push("/auth");
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        setChecking(false);
      } else {
        router.push("/auth");
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  const updateField = (i: number, value: Field["value"]) => {
    const f = [...fields];
    f[i] = { ...f[i], value };
    setFields(f);
  };

  const toggleMulti = (i: number, val: string) => {
    const current = (fields[i].value as string[]) || [];
    updateField(i, current.includes(val) ? current.filter(v => v !== val) : [...current, val]);
  };

  const handleSave = async () => {
    if (!name.trim() || !userId) return;
    setLoading(true);
    const fieldValues: Record<string, string | boolean | string[] | null> = {};
    fields.forEach(f => { fieldValues[f.name] = f.value; });
    const { error } = await supabase.from("contacts").insert({
      user_id: userId,
      full_name: name,
      fields: fieldValues,
    });
    if (!error) {
      setSaved(true);
      setTimeout(() => router.push("/contacts"), 1500);
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
      <div className="w-16 h-16 rounded-full border-2 border-[#C8A96E] bg-[#C8A96E22] flex items-center justify-center text-3xl">✓</div>
      <div className="font-serifext-2xl text-[#F0E6D3]">{name} added.</div>
      <div className="text-sm text-[#7A7068]">Heading back to your people...</div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#141210] text-[#F0E6D3]">
      <header className="flex items-center justify-between px-6 py-5 border-b border-[#2E2924] sticky top-0 bg-[#141210] z-10">
        <button onClick={() => router.push("/contacts")} className="text-sm text-[#7A7068] hover:text-[#F0E6D3] transition-colors">
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
        {fields.map((field, i) => (
          <div key={field.name} className="bg-[#1C1916] border border-[#2E2924] rounded-2xl p-4">
            <div className="text-xs text-[#7A7068] mb-3 font-medium">{field.name}</div>
            {field.type === "bool" && (
              <div className="flex gap-2">
                {([true, false] as boolean[]).map(v => (
                  <button key={String(v)} onClick={() => updateField(i, v)}
                    className={`flex-1 py-2 rounded-lg text-sm border transition-all ${field.value === v ? "border-[#C8A96E] text-[#C8A96E] bg-[#28211A]" : "border-[#2E2924] text-[#7A7068]"}`}>
                    {v ? "Yes" : "No"}
                  </button>
                ))}
              </div>
            )}
            {field.type === "text" && (
              <input type="text" placeholder={`Enter ${field.name.toLowerCase()}`}
                value={(field.value as string) || ""}
                onChange={e => updateField(i, e.target.value)}
                className="w-full bg-[#231F1B] border border-[#2E2924] rounded-lg px-3 py-2 text-sm text-[#F0E6D3] placeholder-[#7A7068] outline-none focus:border-[#C8A96E] transition-colors"
              />
            )}
            {field.type === "select" && (
              <div className="flex flex-wrap gap-2">
                {field.options?.map(opt => (
                  <button key={opt} onClick={() => updateField(i, opt)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-all ${field.value === opt ? "border-[#C8A96E] text-[#C8A96E] bg-[#28211A]" : "border-[#2E2924] text-[#7A7068]"}`}>
                    {opt}
                  </button>
                ))}
              </div>
            )}
            {field.type === "multi" && (
              <div className="flex flex-wrap gap-2">
                {field.options?.map(opt => (
                  <button key={opt} onClick={() => toggleMulti(i, opt)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-all ${(field.value as string[])?.includes(opt) ? "border-[#C8A96E] text-[#C8A96E] bg-[#28211A]" : "border-[#2E2924] text-[#7A7068]"}`}>
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        <button onClick={handleSave} disabled={!name.trim() || loading}
          className="w-full py-4 bg-[#C8A96E] text-[#141210] rounded-xl font-semibold text-sm hover:bg-[#D4B87E] transition-colors disabled:bg-[#2E2924] disabled:text-[#7A7068]">
          {loading ? "Saving..." : "Save friend"}
        </button>
      </div>
    </main>
  );
}
