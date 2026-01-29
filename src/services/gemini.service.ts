import { GoogleGenAI } from "@google/genai";

interface SearchOptions {
  prompt: string;
  apiKey: string;
  model?: string;
}

async function search({
  prompt,
  apiKey,
  model = "gemini-2.0-flash",
}: SearchOptions) {
  if (!apiKey) {
    throw new Error("API key is required for Gemini service");
  }

  const AI = new GoogleGenAI({ apiKey });

  const response = await AI.models.generateContent({
    model,
    contents: prompt,
  });

  return response;
}

export { search };
