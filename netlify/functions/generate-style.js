import fetch from "node-fetch";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Stored securely in Netlify env vars
});

export async function handler(event, context) {
  try {
    const { prompt } = JSON.parse(event.body);

    // Ask OpenAI to generate map colors
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a map style generator that returns a JSON of Leaflet map CSS overrides.",
        },
        {
          role: "user",
          content: `Generate a JSON style object for a Leaflet map with this theme: ${prompt}. Include colors in hex format (for water, land, roads, buildings, parks).`,
        },
      ],
    });

    const styleJSON = completion.choices[0].message.content;

    return {
      statusCode: 200,
      body: JSON.stringify({ styleJSON }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}
