import { Hono } from 'hono';
import { askQuestion } from '../lib/chat.js';

const app = new Hono();

app.post('/', async (c) => {
  const body = await c.req.json<{
    message: string;
    history?: { role: 'user' | 'assistant'; content: string }[];
  }>();

  if (!body.message || typeof body.message !== 'string') {
    return c.json({ error: 'message is required' }, 400);
  }

  try {
    const result = await askQuestion(body.message, body.history ?? []);
    return c.json(result);
  } catch (err) {
    console.error('Chat error:', err);
    return c.json({ error: 'Failed to generate response' }, 500);
  }
});

export default app;
