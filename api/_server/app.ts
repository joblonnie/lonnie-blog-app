import { Hono } from 'hono';
import { cors } from 'hono/cors';
import documents from './routes/documents.js';
import media from './routes/media.js';
import ontology from './routes/ontology.js';
import chat from './routes/chat.js';

export const app = new Hono().basePath('/api');

app.use('*', cors());
app.route('/documents', documents);
app.route('/media', media);
app.route('/ontology', ontology);
app.route('/chat', chat);
