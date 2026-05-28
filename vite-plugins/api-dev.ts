import { loadEnv, type Plugin, type ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Plugin Vite que permite ejecutar las Vercel Functions de /api/* durante
 * `npm run dev`, sin necesidad de instalar `vercel dev`.
 *
 * Asume que cada función exporta default un handler estilo Edge:
 *   export default async function (req: Request): Promise<Response>
 *
 * Detrás de escena convierte el req/res de Node a Web Request/Response,
 * ejecuta el handler, y serializa la Response de vuelta.
 */
export function apiDevPlugin(): Plugin {
  return {
    name: 'api-dev',
    configureServer(server: ViteDevServer) {
      // En dev, copiar TODAS las vars del .env al process.env del proceso Vite
      // para que los handlers de /api/* puedan leer las server-only (sin prefijo VITE_).
      const mode = server.config.mode;
      const envDir = server.config.envDir ?? process.cwd();
      const envVars = loadEnv(mode, envDir, '');
      for (const [k, v] of Object.entries(envVars)) {
        if (process.env[k] === undefined) process.env[k] = v;
      }

      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        if (!req.url) return next();
        const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
        if (!url.pathname.startsWith('/api/')) return next();

        const fnName = url.pathname.replace(/^\/api\//, '').replace(/\/$/, '');
        if (!fnName) return next();

        try {
          const mod = await server.ssrLoadModule(`/api/${fnName}.ts`);
          const handler = mod.default as (req: Request) => Promise<Response> | Response;
          if (typeof handler !== 'function') {
            res.statusCode = 500;
            res.end(`/api/${fnName}.ts no exporta default handler`);
            return;
          }

          const webRequest = await nodeReqToWebRequest(req, url);
          const webResponse = await handler(webRequest);

          res.statusCode = webResponse.status;
          webResponse.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });
          const buf = Buffer.from(await webResponse.arrayBuffer());
          res.end(buf);
        } catch (e) {
          const msg = e instanceof Error ? e.stack ?? e.message : String(e);
          console.error(`[api-dev] error en /api/${fnName}:`, msg);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: msg }));
        }
      });
    },
  };
}

async function nodeReqToWebRequest(req: IncomingMessage, url: URL): Promise<Request> {
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) headers.set(k, v.join(', '));
    else if (v) headers.set(k, v);
  }

  const method = (req.method ?? 'GET').toUpperCase();
  let body: ArrayBuffer | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    body = await readNodeBody(req);
  }

  return new Request(url.toString(), {
    method,
    headers,
    body: body && body.byteLength > 0 ? body : undefined,
  });
}

function readNodeBody(req: IncomingMessage): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).buffer as ArrayBuffer));
    req.on('error', reject);
  });
}
