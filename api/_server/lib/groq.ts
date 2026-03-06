const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

export async function callGroq(
  messages: { role: string; content: string }[],
  options: { json?: boolean; temperature?: number; max_tokens?: number } = {},
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');

  const body: Record<string, unknown> = {
    model: GROQ_MODEL,
    temperature: options.temperature ?? 0.4,
    max_tokens: options.max_tokens ?? 1024,
    messages,
  };
  if (options.json) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Groq API error:', res.status, text);
    throw new Error(`Groq API error: ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}
