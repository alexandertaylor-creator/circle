"use client";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { BottomNav } from "@/components/BottomNav";

const PAGE_SIZE = 50;

type Contact = {
  id: string;
  full_name: string;
  last_contacted: string | null;
  interests: string[] | null;
  groups: string[] | null;
  photo_url: string | null;
};

type FilterChip = {
  label: string;
  kind: "interest" | "group";
};

function ContactsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [userAvatarUrl, setUserAvatarUrl] = useState("");
  const [userDisplayName, setUserDisplayName] = useState("");
  const [allInterests, setAllInterests] = useState<string[]>([]);
  const [allGroups, setAllGroups] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<FilterChip[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const loadingMoreTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appliedUrlParamsRef = useRef(false);

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
      const { data } = await supabase
        .from("contacts")
        .select("id, full_name, last_contacted, interests, groups, photo_url")
        .limit(1000);
      const { data: interactions } = await supabase
        .from("interactions")
        .select("contact_id")
        .eq("user_id", session.user.id)
        .limit(10000);
      if (data) {
        const countByContact = (interactions || []).reduce((acc, r) => {
          acc[r.contact_id] = (acc[r.contact_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const sorted = [...data].sort((a, b) => (countByContact[b.id] || 0) - (countByContact[a.id] || 0));
        setContacts(sorted);
        setAllInterests(Array.from(new Set(data.flatMap(c => c.interests || []))).sort());
        setAllGroups(Array.from(new Set(data.flatMap(c => c.groups || []))).sort());
      }
      setLoading(false);
    };
    load();
  }, [router]);

  // Apply interest= and group= from URL once on load so the filter chips are pre-selected
  useEffect(() => {
    if (appliedUrlParamsRef.current || contacts.length === 0) return;
    const interest = searchParams.get("interest");
    const group = searchParams.get("group");
    if (!interest && !group) return;
    appliedUrlParamsRef.current = true;
    const next: FilterChip[] = [];
    if (interest) next.push({ label: decodeURIComponent(interest), kind: "interest" });
    if (group) next.push({ label: decodeURIComponent(group), kind: "group" });
    if (next.length > 0) setActiveFilters(next);
  }, [searchParams, contacts.length]);

  // Reset visible count when search or filters change so infinite scroll starts from top
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, activeFilters]);

  const matchesFilters = (contact: Contact) => {
    if (activeFilters.length === 0) return true;
    return activeFilters.every(filter => {
      if (filter.kind === "interest") return (contact.interests || []).includes(filter.label);
      return (contact.groups || []).includes(filter.label);
    });
  };

  const filtered = contacts.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) && matchesFilters(c)
  );
  const visibleContacts = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    if (loadingMoreTimeoutRef.current) clearTimeout(loadingMoreTimeoutRef.current);
    setLoadingMore(true);
    setVisibleCount(prev => Math.min(prev + PAGE_SIZE, filtered.length));
    loadingMoreTimeoutRef.current = setTimeout(() => {
      setLoadingMore(false);
      loadingMoreTimeoutRef.current = null;
    }, 300);
  }, [hasMore, loadingMore, filtered.length]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingMore) loadMore();
      },
      { rootMargin: "100px", threshold: 0 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (loadingMoreTimeoutRef.current) clearTimeout(loadingMoreTimeoutRef.current);
    };
  }, [loadMore, hasMore, loadingMore]);

  const isActive = (chip: FilterChip) =>
    activeFilters.some(f => f.kind === chip.kind && f.label === chip.label);

  const toggleFilter = (chip: FilterChip) => {
    if (isActive(chip)) {
      setActiveFilters(prev => prev.filter(f => !(f.kind === chip.kind && f.label === chip.label)));
    } else {
      setActiveFilters(prev => [...prev, chip]);
    }
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
    if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? "s" : ""} ago`;
    return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? "s" : ""} ago`;
  };

  return (
    <main className="min-h-screen bg-[#141210] text-[#F0E6D3] pb-24">
      <header className="flex items-center justify-between px-6 py-5 border-b border-[#2E2924] sticky top-0 bg-[#141210] z-10">
        <button onClick={() => router.push("/dashboard")} className="font-serif italic text-[#C8A96E] text-xl">circle</button>
        <button onClick={() => router.push("/profile")} className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-[#C8A96E] text-[#141210] text-sm font-bold">
          {userAvatarUrl ? (
            <img src={userAvatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            (userDisplayName || "?")[0].toUpperCase()
          )}
        </button>
      </header>
      <div className="max-w-lg mx-auto px-4 py-6">
        <input
          type="text"
          placeholder="Search your people..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#1C1916] border border-[#2E2924] rounded-xl px-4 py-3 text-sm text-[#F0E6D3] placeholder-[#7A7068] outline-none focus:border-[#C8A96E] transition-colors mb-4"
        />

        {allInterests.length > 0 && (
          <div className="mb-3">
            <div className="text-xs text-[#7A7068] uppercase tracking-widest mb-2 font-semibold">Interests</div>
            <div className="flex flex-wrap gap-2">
              {allInterests.map(tag => (
                <button key={tag} onClick={() => toggleFilter({ label: tag, kind: "interest" })}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${isActive({ label: tag, kind: "interest" }) ? "border-[#C8A96E] text-[#C8A96E] bg-[#28211A]" : "border-[#2E2924] text-[#7A7068]"}`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {allGroups.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-[#7A7068] uppercase tracking-widest mb-2 font-semibold">Groups</div>
            <div className="flex flex-wrap gap-2">
              {allGroups.map(tag => (
                <button key={tag} onClick={() => toggleFilter({ label: tag, kind: "group" })}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${isActive({ label: tag, kind: "group" }) ? "border-[#C8A96E] text-[#C8A96E] bg-[#28211A]" : "border-[#2E2924] text-[#7A7068]"}`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeFilters.length > 0 && (
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <button onClick={() => setActiveFilters([])} className="text-xs text-[#7A7068] hover:text-[#F0E6D3] transition-colors">
              Clear all filters
            </button>
          </div>
        )}

        {activeFilters.length > 0 && filtered.length > 0 && (
          <button
            onClick={() => router.push(`/plan?contactIds=${filtered.map(c => c.id).join(",")}`)}
            className="w-full py-3.5 bg-[#C8A96E] text-[#141210] rounded-xl font-semibold text-sm hover:bg-[#D4B87E] transition-colors mb-4"
          >
            Plan something with these people
          </button>
        )}

        {loading ? (
          <div className="text-center text-[#7A7068] text-sm py-12">Loading your people...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-[#7A7068] text-sm py-12">
            {contacts.length === 0 ? "No friends yet — add your first one!" : "No matches found."}
          </div>
        ) : (
          <>
            <div className="text-xs text-[#7A7068] mb-4 uppercase tracking-widest font-semibold">
              {filtered.length} {filtered.length === 1 ? "person" : "people"}
            </div>
            <div className="flex flex-col gap-3">
              {visibleContacts.map(contact => (
                <div key={contact.id} onClick={() => router.push(`/contacts/${contact.id}`)} className="bg-[#1C1916] border border-[#2E2924] rounded-2xl p-4 flex items-center gap-4 hover:border-[#C8A96E33] transition-all cursor-pointer">
                  {contact.photo_url ? (
                    <img src={contact.photo_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ background: getColor(contact.full_name) }}>
                      {getInitials(contact.full_name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[#F0E6D3] text-sm">{contact.full_name}</div>
                    <div className="text-xs text-[#7A7068] mt-0.5">Last seen {getLastSeen(contact.last_contacted)}</div>
                    {(() => {
                      const groups = contact.groups || [];
                      const interests = contact.interests || [];
                      const combined = [...groups, ...interests];
                      if (combined.length === 0) return null;
                      let visible: string[];
                      let moreCount: number;
                      if (groups.length > 5) {
                        visible = groups.slice(0, 8);
                        moreCount = Math.max(0, groups.length - 8) + interests.length;
                      } else if (interests.length > 5) {
                        visible = [...groups, ...interests.slice(0, 8)];
                        moreCount = Math.max(0, interests.length - 8);
                      } else {
                        visible = combined.slice(0, 5);
                        moreCount = Math.max(0, combined.length - 5);
                      }
                      return (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {visible.map((tag, i) => (
                            <span key={`${tag}-${i}`} className="text-xs px-2 py-0.5 rounded-full bg-[#28211A] border border-[#C8A96E33] text-[#C8A96E88] capitalize">
                              {tag}
                            </span>
                          ))}
                          {moreCount > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[#28211A] border border-[#2E2924] text-[#7A7068]">
                              +{moreCount} more
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ))}
              {hasMore && <div ref={loadMoreRef} className="h-4 min-h-4" aria-hidden />}
              {loadingMore && (
                <div className="text-center text-[#7A7068] text-xs py-3">Loading more...</div>
              )}
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </main>
  );
}

export default function ContactsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#141210]" />}>
      <ContactsPageInner />
    </Suspense>
  );
}
