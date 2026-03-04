import type { IncomingMessage, ServerResponse } from 'node:http';
import { app } from './_server/app.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const rawProto = req.headers['x-forwarded-proto'] || 'https';
  const protocol = String(rawProto).split(',')[0].trim();
  const rawHost = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  const host = String(rawHost).split(',')[0].trim();
  const url = `${protocol}://${host}${req.url}`;

  const headers = new Headers();
  for (const [key, val] of Object.entries(req.headers)) {
    if (val) headers.set(key, Array.isArray(val) ? val.join(', ') : val);
  }

  let body: ArrayBuffer | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await new Promise<ArrayBuffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
      });
      req.on('error', reject);
    });
  }

  const request = new Request(url, {
    method: req.method,
    headers,
    body,
  });

  const response = await app.fetch(request);

  res.statusCode = response.status;

  const setCookies = response.headers.getSetCookie();
  if (setCookies.length > 0) {
    res.setHeader('set-cookie', setCookies);
  }

  response.headers.forEach((val, key) => {
    if (key.toLowerCase() !== 'set-cookie') {
      res.setHeader(key, val);
    }
  });

  const arrayBuffer = await response.arrayBuffer();
  res.end(Buffer.from(arrayBuffer));
}
