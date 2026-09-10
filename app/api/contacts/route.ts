import { NextResponse } from "next/server";

type HunterEmail = {
  value?: string;
  type?: string;
  confidence?: number;
  first_name?: string;
  last_name?: string;
  position?: string;
  department?: string;
  seniority?: string;
};

const roleProfiles: Record<string, string[]> = {
  ugc_ads: ["paid social", "performance", "growth", "creative strategist", "influencer", "creator", "social media", "brand marketing"],
  organic: ["social media", "content", "creator", "influencer", "brand marketing", "partnerships", "pr"],
  tiktok_shop: ["tiktok shop", "social commerce", "affiliate", "creator", "influencer", "partnerships", "social media"],
  gifted: ["influencer", "creator", "pr", "communications", "social media", "partnerships"],
  local: ["marketing director", "marketing manager", "social media", "partnerships", "owner", "founder", "general manager"]
};

function scoreContact(c: HunterEmail, offer: string) {
  const haystack = `${c.position ?? ""} ${c.department ?? ""}`.toLowerCase();
  const priorities = roleProfiles[offer] ?? roleProfiles.ugc_ads;
  let score = Math.min(c.confidence ?? 0, 100) * 0.22;
  priorities.forEach((term, index) => {
    if (haystack.includes(term)) score += Math.max(8, 46 - index * 5);
  });
  if (c.type === "personal") score += 10;
  if (["senior", "executive"].includes((c.seniority ?? "").toLowerCase())) score += 6;
  if (/customer|support|sales|engineer|recruit|talent|hr|legal|finance/.test(haystack)) score -= 45;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function reasonFor(c: HunterEmail, offer: string) {
  const title = c.position || c.department || "Marketing contact";
  const map: Record<string, string> = {
    ugc_ads: "strong fit for conversion-focused UGC, paid social, or ad creative.",
    organic: "relevant to organic social content and creator-led brand storytelling.",
    tiktok_shop: "relevant to social commerce, affiliate, creator, or TikTok Shop opportunities.",
    gifted: "relevant to influencer seeding, PR, and creator collaborations.",
    local: "likely close to marketing decisions for a local or smaller business."
  };
  return `${title}: ${map[offer] ?? map.ugc_ads}`;
}

export async function POST(req: Request) {
  const { company, domain, offer = "ugc_ads" } = await req.json();
  if (!company && !domain) return NextResponse.json({ error: "Enter a brand name or domain." }, { status: 400 });

  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      demo: true,
      organization: company || domain,
      domain: domain || "brand.com",
      contacts: [
        { name: "Avery Morgan", email: "avery@brand.com", position: "Influencer Marketing Manager", department: "marketing", confidence: 93, matchScore: 96, reason: "Influencer Marketing Manager: directly aligned with creator partnerships and UGC outreach." },
        { name: "Jordan Lee", email: "jordan@brand.com", position: "Paid Social Manager", department: "marketing", confidence: 89, matchScore: offer === "ugc_ads" ? 94 : 80, reason: reasonFor({ position: "Paid Social Manager" }, offer) },
        { name: "Sam Rivera", email: "sam@brand.com", position: "Social Media Manager", department: "marketing", confidence: 86, matchScore: 82, reason: reasonFor({ position: "Social Media Manager" }, offer) }
      ],
      message: "Demo contacts shown. Add HUNTER_API_KEY in Vercel to return live brand contacts."
    });
  }

  const params = new URLSearchParams({ limit: "10" });
  if (domain) params.set("domain", String(domain).replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]);
  else params.set("company", company);

  const response = await fetch(`https://api.hunter.io/v2/domain-search?${params.toString()}`, {
    headers: { "X-API-KEY": apiKey },
    cache: "no-store"
  });
  const payload = await response.json();
  if (!response.ok) return NextResponse.json({ error: payload?.errors?.[0]?.details ?? "Hunter search failed." }, { status: response.status });

  const emails: HunterEmail[] = payload?.data?.emails ?? [];
  const contacts = emails.map((c) => ({
      name: [c.first_name, c.last_name].filter(Boolean).join(" ") || "Brand contact",
      email: c.value,
      position: c.position || "Marketing contact",
      department: c.department || "",
      confidence: c.confidence ?? null,
      matchScore: scoreContact(c, offer),
      reason: reasonFor(c, offer)
    }))
    .filter((c) => c.email)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 5);

  return NextResponse.json({ demo: false, organization: payload?.data?.organization ?? company ?? domain, domain: payload?.data?.domain ?? domain, contacts });
}
