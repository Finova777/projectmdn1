// Server-only Google Gemini client. Never import this from a browser/client
// component — it reads GEMINI_API_KEY from the server environment (set in the
// Vercel Environment Variables, not in VITE_* so it is never shipped to the
// browser). Import it lazily inside server function handlers only.

const GEMINI_HOST = "https://generativelanguage.googleapis.com";
// Fast, inexpensive, good enough for short financial-education replies.
const DEFAULT_MODEL = "gemini-2.5-flash";

export class GeminiError extends Error {
  readonly status: number | undefined;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "GeminiError";
    this.status = status;
  }
}

function apiKey(): string {
  const key = process.env["GEMINI_API_KEY"]?.trim();
  if (!key) throw new GeminiError("GEMINI_API_KEY belum diset di server.", 401);
  return key;
}

export interface GeminiContent {
  role: "user" | "model";
  parts: { text: string }[];
}

interface GenerateOptions {
  contents: GeminiContent[];
  system?: string;
  model?: string;
  /** When set, forces structured JSON output matching this schema. */
  responseSchema?: Record<string, unknown>;
  temperature?: number;
  maxOutputTokens?: number;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
}

/** Low-level call to Gemini's generateContent endpoint. Returns the plain text
 *  of the first candidate, or throws GeminiError with an HTTP-ish status. */
export async function generateGemini(opts: GenerateOptions): Promise<string> {
  const model = opts.model ?? DEFAULT_MODEL;
  const body: Record<string, unknown> = {
    contents: opts.contents,
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: opts.maxOutputTokens ?? 1024,
      ...(opts.responseSchema
        ? { responseMimeType: "application/json", responseSchema: opts.responseSchema }
        : {}),
    },
  };
  if (opts.system) body["systemInstruction"] = { parts: [{ text: opts.system }] };

  let response: Response;
  try {
    response = await fetch(`${GEMINI_HOST}/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey() },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new GeminiError("Tidak bisa menghubungi layanan AI.", 503);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new GeminiError(`Gemini HTTP ${response.status}: ${detail.slice(0, 200)}`, response.status);
  }

  const data = (await response.json()) as GeminiResponse;
  if (data.promptFeedback?.blockReason) {
    throw new GeminiError("Permintaan diblokir oleh filter keamanan AI.", 400);
  }
  const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
  if (!text.trim()) throw new GeminiError("Balasan AI kosong.", 502);
  return text;
}
