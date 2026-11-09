// ═══════════════════════════════════════════════════════════
// NAVIK — Ollama Client
// Talks to local Ollama API at http://localhost:11434
// Models:
//   llama3.2:3b       → reasoning, agent decisions, text
//   qwen2.5-coder:3b  → structured JSON output
//   bge-m3:latest     → semantic embeddings (dim=1024)
//   qwen2.5vl:7b      → vision/image analysis
// ═══════════════════════════════════════════════════════════

export const OLLAMA_BASE = 'http://localhost:11434';

export const MODELS = {
  reasoning:  'llama3.2:3b',
  structured: 'qwen2.5-coder:3b',
  embedding:  'bge-m3:latest',
  vision:     'qwen2.5vl:7b',
} as const;

export type ModelRole = keyof typeof MODELS;

// ── Health check ──────────────────────────────────────────
export async function checkOllamaHealth(): Promise<{ ok: boolean; models: string[] }> {
  try {
    const r = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!r.ok) return { ok: false, models: [] };
    const data = await r.json() as { models: Array<{ name: string }> };
    return { ok: true, models: data.models.map((m) => m.name) };
  } catch {
    return { ok: false, models: [] };
  }
}

// ── Text generation ───────────────────────────────────────
interface GenerateOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export async function generate(
  prompt: string,
  opts: GenerateOptions = {}
): Promise<string> {
  const model   = opts.model ?? MODELS.reasoning;
  const timeout = opts.timeoutMs ?? 30000;

  const body = {
    model,
    prompt,
    stream: false,
    options: {
      temperature:  opts.temperature ?? 0.3,
      num_predict:  opts.maxTokens  ?? 300,
      num_ctx:      2048,
    },
  };

  const r = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeout),
  });

  if (!r.ok) {
    const err = await r.text();
    throw new Error(`Ollama generate failed: ${err}`);
  }

  const data = await r.json() as { response: string };
  return data.response.trim();
}

// ── Chat (multi-turn) ─────────────────────────────────────
interface Message { role: 'system' | 'user' | 'assistant'; content: string; }

export async function chat(
  messages: Message[],
  opts: GenerateOptions = {}
): Promise<string> {
  const model  = opts.model ?? MODELS.reasoning;
  const timeout = opts.timeoutMs ?? 30000;

  const body = {
    model,
    messages,
    stream: false,
    options: {
      temperature: opts.temperature ?? 0.3,
      num_predict: opts.maxTokens  ?? 400,
      num_ctx:     2048,
    },
  };

  const r = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeout),
  });

  if (!r.ok) {
    const err = await r.text();
    throw new Error(`Ollama chat failed: ${err}`);
  }

  const data = await r.json() as { message: { content: string } };
  return data.message.content.trim();
}

// ── Structured JSON output ────────────────────────────────
export async function generateJSON<T>(
  prompt: string,
  opts: GenerateOptions = {}
): Promise<T> {
  const fullPrompt = `${prompt}

Respond ONLY with valid JSON. No explanation, no markdown, no code blocks. Just the JSON object.`;

  const raw = await generate(fullPrompt, {
    model:       opts.model ?? MODELS.structured,
    temperature: opts.temperature ?? 0.1,
    maxTokens:   opts.maxTokens ?? 500,
    timeoutMs:   opts.timeoutMs ?? 40000,
  });

  // Try to extract JSON from response
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON in response: ${raw.slice(0, 100)}`);

  return JSON.parse(jsonMatch[0]) as T;
}

// ── Embeddings ────────────────────────────────────────────
export async function embed(text: string): Promise<number[]> {
  const body = { model: MODELS.embedding, input: text };

  const r = await fetch(`${OLLAMA_BASE}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });

  if (!r.ok) throw new Error(`Ollama embed failed: ${await r.text()}`);

  const data = await r.json() as { embeddings: number[][] };
  return data.embeddings[0];
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  return Promise.all(texts.map(embed));
}

// ── Vision — analyse image with qwen2.5vl ────────────────
export async function analyzeImage(
  base64Image: string,
  prompt: string,
  opts: GenerateOptions = {}
): Promise<string> {
  const body = {
    model: MODELS.vision,
    prompt,
    images: [base64Image],
    stream: false,
    options: {
      temperature:  opts.temperature ?? 0.2,
      num_predict:  opts.maxTokens  ?? 400,
      num_ctx:      4096,
    },
  };

  const r = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 90000),
  });

  if (!r.ok) throw new Error(`Vision analysis failed: ${await r.text()}`);
  const data = await r.json() as { response: string };
  return data.response.trim();
}

// ── Cosine similarity (for semantic search) ───────────────
export function cosineSimilarity(a: number[], b: number[]): number {
  const dot  = a.reduce((s, v, i) => s + v * b[i], 0);
  const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return magA && magB ? dot / (magA * magB) : 0;
}
