import OpenAI from "openai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const { brand, contact, creator, offer = "ugc_ads", angle = "direct" } = body;
  if (!brand || !contact?.email) return NextResponse.json({ error: "Choose a brand contact first." }, { status: 400 });

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    const first = contact.name?.split(" ")?.[0] || "there";
    return NextResponse.json({
      demo: true,
      subject: `UGC ideas for ${brand}`,
      pitch: `Hi ${first},\n\nI’m ${creator?.name || "a UGC creator"} and I’d love to create conversion-focused content for ${brand}. I specialize in ${creator?.niches || "relatable, brand-ready UGC"}, and I already have a few content angles in mind that could work for your social channels.\n\nWould you be open to me sending over 2–3 concepts and my portfolio?\n\n${creator?.portfolio ? `Portfolio: ${creator.portfolio}\n` : ""}${creator?.email ? creator.email : ""}`,
      message: "Demo draft shown. Add OPENAI_API_KEY in Vercel for live AI personalization."
    });
  }

  const openai = new OpenAI({ apiKey: key });
  const prompt = `You are an expert UGC outreach strategist. Write a concise, natural cold email for a creator pitching a brand. Never invent brand facts, campaigns, results, or creator credentials.\n\nBrand: ${brand}\nContact: ${contact.name || "Unknown"}, ${contact.position || "Unknown role"}\nCreator name: ${creator?.name || ""}\nCreator niches: ${creator?.niches || ""}\nCreator proof/experience: ${creator?.proof || ""}\nPortfolio: ${creator?.portfolio || ""}\nCreator email: ${creator?.email || ""}\nOffer type: ${offer}\nPitch angle: ${angle}\n\nReturn JSON with exactly two keys: subject and pitch. Keep the email around 90-140 words, specific to the contact role, confident but not entitled, and end with one low-friction CTA.`;

  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5-mini",
    input: prompt,
    text: { format: { type: "json_object" } }
  });

  try {
    const parsed = JSON.parse(response.output_text);
    return NextResponse.json({ demo: false, ...parsed });
  } catch {
    return NextResponse.json({ error: "The AI returned an invalid pitch response." }, { status: 502 });
  }
}
