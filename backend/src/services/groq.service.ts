import { env } from "../config/env";
import { logger } from "../utils/logger";

export interface MatchExplanationInput {
  hospital: string;
  resourceMatch: number;
  etaMinutes: number;
  distanceKm: number;
  freshnessMinutes: number;
  load: number;
  finalScore: number;
}

export class GroqService {
  /**
   * Explains the hospital match in concise operational language using Groq Llama 3.1.
   * NOTE: Groq NEVER determines ranking, calculates scores, or overrides state.
   * If Groq is unavailable or unconfigured, falls back to deterministic template string.
   */
  static async explainMatch(data: MatchExplanationInput): Promise<string> {
    const fallback = `${data.hospital} satisfies ${data.resourceMatch}% of requested resources with an estimated travel time of ${data.etaMinutes} minutes (${data.distanceKm} km). Capacity data was updated ${data.freshnessMinutes} min ago with a current facility load of ${data.load}%, resulting in a match score of ${data.finalScore}%.`;

    if (!env.GROQ_API_KEY) {
      return fallback;
    }

    try {
      const prompt = `Explain the following emergency hospital match in concise operational language (under 35 words).
Do not make a new recommendation. Do not change the score. Do not invent facts. Explain only the supplied data:
- Hospital: ${data.hospital}
- Resource Fulfillment: ${data.resourceMatch}%
- Estimated Travel Time: ${data.etaMinutes} min
- Distance: ${data.distanceKm} km
- Data Freshness: ${data.freshnessMinutes} min ago
- Current Load: ${data.load}%
- Final Match Score: ${data.finalScore}%`;

      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content:
                "You are an emergency dispatch operational assistant. Provide a single, professional, factual explanation of the matching score. Never give medical advice.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 70,
        }),
      });

      if (resp.ok) {
        const json = (await resp.json()) as any;
        const text = json.choices?.[0]?.message?.content?.trim();
        if (text) return text;
      }
    } catch (err) {
      logger.warn("Groq explanation API failed, using deterministic explanation", err);
    }

    return fallback;
  }
}
