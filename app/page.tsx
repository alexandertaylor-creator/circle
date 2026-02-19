import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "circle — be the friend you mean to be",
};

export default function Home() {
  return (
    <main className="min-h-screen bg-[#141210] text-[#F0E6D3] flex flex-col">
      <header className="flex items-center justify-between px-8 py-6 border-b border-[#2E2924]">
        <span className="font-serif italic text-[#C8A96E] text-2xl">circle</span>
        <a href="/auth" className="text-sm text-[#7A7068] hover:text-[#F0E6D3] transition-colors">
          Sign in
        </a>
      </header>

      <section className="flex flex-col items-center justify-center flex-1 px-6 py-24 text-center">
        <h1 className="font-serif text-5xl md:text-6xl text-[#F0E6D3] mb-4 leading-tight">
          Be the friend
          <br />
          <span className="italic text-[#C8A96E]">you mean to be.</span>
        </h1>
        <p className="text-[#7A7068] text-lg max-w-md mb-4 leading-relaxed">
        Life gets busy. People slip through the cracks. Circle helps you remember who to invite, who to check in on, and who you haven't seen in way too long.
        </p>
        <p className="text-[#7A7068] text-sm max-w-sm mb-10 leading-relaxed">
          Filter your people by shared interests, plan events with the right crowd, and never accidentally leave someone out again.
        </p>
        <a href="/auth" className="px-8 py-4 bg-[#C8A96E] text-[#141210] rounded-xl font-semibold text-sm hover:bg-[#D4B87E] transition-colors">
          Get started
        </a>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 px-8 pb-20 max-w-4xl mx-auto w-full">
        {[
          { icon: "◎", title: "Never forget anyone", desc: "Filter your people by shared interests in seconds. Rockets game tonight? See exactly who to invite." },
          { icon: "✦", title: "Know your people", desc: "Track what matters — hobbies, dietary needs, how you met. The details that make you a thoughtful ." },
          { icon: "◈", title: "Stay in touch", desc: "Get nudged when you haven't seen someone in a while. Because out of sight shouldn't mean out of mind." },
        ].map((f) => (
          <div key={f.title} className="bg-[#1C1916] border border-[#2E2924] rounded-2xl p-6">
            <div className="text-[#C8A96E] text-2xl mb-4">{f.icon}</div>
            <div className="font-semibold text-[#F0E6D3] mb-2">{f.title}</div>
            <div className="text-sm text-[#7A7068] leading-relaxed">{f.desc}</div>
          </div>
        ))}
      </section>
    </main>
  );
}
