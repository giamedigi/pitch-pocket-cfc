"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Contact = { name: string; email: string; position: string; department?: string; confidence?: number | null; matchScore: number; reason: string };
type Creator = { name: string; email: string; portfolio: string; niches: string; proof: string };
const EMPTY_CREATOR: Creator = { name: "", email: "", portfolio: "", niches: "", proof: "" };

export default function Home() {
  const [creator, setCreator] = useState<Creator>(EMPTY_CREATOR);
  const [company, setCompany] = useState("");
  const [domain, setDomain] = useState("");
  const [offer, setOffer] = useState("ugc_ads");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [subject, setSubject] = useState("");
  const [pitch, setPitch] = useState("");
  const [status, setStatus] = useState("");
  const [searching, setSearching] = useState(false);
  const [writing, setWriting] = useState(false);
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("pitch-pocket-creator");
    if (saved) setCreator(JSON.parse(saved));
  }, []);

  function saveCreator() {
    localStorage.setItem("pitch-pocket-creator", JSON.stringify(creator));
    setStatus("Creator profile saved ✨");
  }

  async function findContacts(e: FormEvent) {
    e.preventDefault();
    setSearching(true); setStatus(""); setPitch(""); setSelected(null);
    try {
      const res = await fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company, domain, offer }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not find contacts");
      setContacts(data.contacts || []); setDemo(Boolean(data.demo));
      setStatus(data.contacts?.length ? `Found ${data.contacts.length} ranked contact${data.contacts.length === 1 ? "" : "s"}.` : "No matching contacts found yet.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Something went wrong."); }
    finally { setSearching(false); }
  }

  async function generatePitch() {
    if (!selected) return;
    setWriting(true); setStatus("");
    try {
      const res = await fetch("/api/pitch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brand: company || domain, contact: selected, creator, offer, angle: "direct" }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not generate pitch");
      setSubject(data.subject || ""); setPitch(data.pitch || ""); setDemo((d) => d || Boolean(data.demo));
    } catch (error) { setStatus(error instanceof Error ? error.message : "Something went wrong."); }
    finally { setWriting(false); }
  }

  const completeness = useMemo(() => Object.values(creator).filter(Boolean).length, [creator]);

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brandmark"><span>✦</span><div><b>Pitch Pocket</b><small>UGC Outreach Assistant</small></div></div>
        <nav><a className="active">⌕ Brand Finder</a><a>◎ Pipeline <em>Soon</em></a><a>✉ Follow-ups <em>Soon</em></a><a>⚙ Settings</a></nav>
        <div className="sideCard"><span className="eyebrow">CREATOR FLOW TOOL</span><strong>Find the right person. Pitch smarter.</strong><p>Built for creators who want outreach to feel strategic, not spammy.</p></div>
      </aside>

      <section className="workspace">
        <header className="topbar"><div><span className="eyebrow">UGC OUTREACH COMMAND CENTER</span><h1>Who should we pitch? 👀</h1><p>Find a brand, rank the best contacts, then generate a pitch around the person who can say yes.</p></div><div className="profileChip"><span>{completeness}/5</span> profile details</div></header>

        <section className="card profileCard">
          <div className="cardHead"><div><span className="step">01</span><div><h2>Your creator profile</h2><p>Saved once, used to personalize future outreach.</p></div></div><button className="ghost" onClick={saveCreator}>Save profile</button></div>
          <div className="grid five">
            <label>Name<input value={creator.name} onChange={(e)=>setCreator({...creator,name:e.target.value})} placeholder="Marie" /></label>
            <label>Email<input value={creator.email} onChange={(e)=>setCreator({...creator,email:e.target.value})} placeholder="you@email.com" /></label>
            <label>Portfolio<input value={creator.portfolio} onChange={(e)=>setCreator({...creator,portfolio:e.target.value})} placeholder="yourportfolio.com" /></label>
            <label>Niches<input value={creator.niches} onChange={(e)=>setCreator({...creator,niches:e.target.value})} placeholder="beauty, lifestyle, food" /></label>
            <label>Proof / experience<input value={creator.proof} onChange={(e)=>setCreator({...creator,proof:e.target.value})} placeholder="100+ brand collaborations" /></label>
          </div>
        </section>

        <section className="card">
          <div className="cardHead"><div><span className="step">02</span><div><h2>Find the brand</h2><p>Search by brand name or paste the company domain.</p></div></div></div>
          <form onSubmit={findContacts} className="searchArea">
            <div className="searchFields">
              <label>Brand name<input value={company} onChange={(e)=>setCompany(e.target.value)} placeholder="e.g. Rare Beauty" /></label><span className="or">OR</span>
              <label>Website/domain<input value={domain} onChange={(e)=>setDomain(e.target.value)} placeholder="rarebeauty.com" /></label>
              <label>What are you pitching?<select value={offer} onChange={(e)=>setOffer(e.target.value)}><option value="ugc_ads">UGC for paid ads</option><option value="organic">Organic UGC / social</option><option value="tiktok_shop">TikTok Shop / affiliate</option><option value="gifted">Gifted / influencer collab</option><option value="local">Local business content</option></select></label>
            </div>
            <button className="primary" disabled={searching}>{searching ? "Finding contacts…" : "Find best contacts →"}</button>
          </form>
          {status && <div className="status">{status}{demo && <span> Demo mode</span>}</div>}
        </section>

        {contacts.length > 0 && <section className="card results">
          <div className="cardHead"><div><span className="step">03</span><div><h2>Best people to pitch</h2><p>Ranked by role relevance + available email confidence.</p></div></div></div>
          <div className="contactList">{contacts.map((c, i)=><button key={`${c.email}-${i}`} className={`contact ${selected?.email===c.email?"selected":""}`} onClick={()=>{setSelected(c);setPitch("");}}>
            <div className="rank">{i+1}</div><div className="contactMain"><div className="contactTitle"><strong>{c.name}</strong>{i===0 && <span className="best">BEST MATCH</span>}</div><span>{c.position}</span><small>{c.email}</small><p>{c.reason}</p></div><div className="score"><b>{c.matchScore}</b><small>match</small>{c.confidence ? <em>{c.confidence}% email confidence</em>:null}</div>
          </button>)}</div>
        </section>}

        {selected && <section className="card pitchCard">
          <div className="cardHead"><div><span className="step">04</span><div><h2>Build the pitch</h2><p>Selected: <b>{selected.name}</b> · {selected.position}</p></div></div><button className="primary small" onClick={generatePitch} disabled={writing}>{writing ? "Writing…" : "✨ Generate pitch"}</button></div>
          {pitch ? <div className="composer"><label>Subject<input value={subject} onChange={(e)=>setSubject(e.target.value)} /></label><label>Email<textarea value={pitch} onChange={(e)=>setPitch(e.target.value)} rows={11}/></label><div className="actions"><button className="ghost" onClick={()=>navigator.clipboard.writeText(`Subject: ${subject}\n\n${pitch}`)}>Copy email</button><a className="primary link" href={`mailto:${selected.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(pitch)}`}>Open in email →</a></div></div> : <div className="emptyPitch"><div>✦</div><strong>Ready when you are.</strong><p>Pitch Pocket will use your creator profile + this contact’s role to build a concise first draft.</p></div>}
        </section>}

        <footer>Creator Flow Collective × Giame Digital Design LLC · Pitch Pocket MVP</footer>
      </section>
    </main>
  );
}
