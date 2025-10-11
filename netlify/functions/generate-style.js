// functions/generate-style.js
import OpenAI from "openai";

export async function handler(event) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: "Missing OPENAI_API_KEY in env" }) };
    }

    const body = JSON.parse(event.body || "{}");
    const prompt = body.prompt || "";
    const overrides = body.overrides || {};

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const system = `
You are a helpful assistant that outputs ONLY valid JSON (no explanation).
Given a text prompt describing a map visual style (e.g. "navy blue water, bright red roads, muted land"),
return a JSON object with keys: name (string), water, land, roads, buildings, labels.
Each color should be a 7-character hex string like "#123ABC".
If overrides object is provided, respect those values (do not change them).
Keep names short.
`;

    const userMessage = `Prompt: ${prompt}\nOverrides: ${JSON.stringify(overrides || {})}\nReturn the JSON only.`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMessage }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 300
    });

    // SDK may return parsed JSON when using response_format
    const content = completion.choices?.[0]?.message?.content;
    let style;
    if (typeof content === 'object') style = content;
    else style = JSON.parse(content);

    // Ensure hex format & fill missing with defaults, prefer overrides
    const fallback = {
      name: style.name || 'AI style',
      water: (overrides.water) || style.water || "#a0d8ef",
      land: (overrides.land) || style.land || "#fff2e6",
      roads: (overrides.roads) || style.roads || "#ff85c1",
      buildings: (overrides.buildings) || style.buildings || "#f0e5ff",
      labels: (overrides.labels) || style.labels || "#222222"
    };

    return {
      statusCode: 200,
      body: JSON.stringify({ style: fallback })
    };

  } catch (err) {
    console.error('generate-style error', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err?.message || String(err) })
    };
  }
}
