import { Hono } from 'hono';
import { cors } from 'hono/cors';
import documents from './routes/documents.js';

export const app = new Hono().basePath('/api');

app.use('*', cors());
app.route('/documents', documents);
