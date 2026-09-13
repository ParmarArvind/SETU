import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

if (!apiKey) {
  console.warn(
    '[AI] GEMINI_API_KEY is not configured. AI features will remain unavailable.',
  );
}

const gemini = apiKey
  ? new GoogleGenAI({
      apiKey,
    })
  : null;

export { gemini, model };