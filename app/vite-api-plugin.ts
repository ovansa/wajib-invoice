import type { Connect, Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';

import { resolve } from 'node:path';

/**
 * Dev-only: serve the Vercel serverless functions in `api/` from inside the
 * Vite dev server, so `npm run dev` runs the full stack on one port with no
 * Vercel CLI. Production is unaffected - Vercel builds `api/` itself.
 *
 * Each request to `/api/<path>` loads `api/<path>.ts` and invokes its default
 * export with a Vercel-compatible (req, res) shim.
 */
export function apiPlugin(): Plugin {
  return {
    name: 'dev-api',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      loadEnvLocal();
      server.middlewares.use(
        '/api',
        async (
          req: Connect.IncomingMessage,
          res: ServerResponse,
          next: Connect.NextFunction,
        ) => {
          try {
            const url = new URL(req.url || '/', 'http://localhost');
            // "/auth/login" -> "api/auth/login.ts"
            const rel = url.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
            const file = resolve(__dirname, 'api', `${rel}.ts`);
            if (!existsSync(file)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'not found' }));
              return;
            }
            const mod = await server.ssrLoadModule(file);
            const handler = mod.default as (
              req: unknown,
              res: unknown,
            ) => unknown | Promise<unknown>;

            const body = await readBody(req);
            const shimReq = {
              method: req.method,
              url: req.url,
              headers: req.headers,
              query: Object.fromEntries(url.searchParams),
              body,
            };
            const shimRes = makeRes(res);
            await handler(shimReq, shimRes);
          } catch (err) {
            server.ssrFixStacktrace(err as Error);
            res.statusCode = 500;
            res.end(
              JSON.stringify({ error: 'dev api error', detail: String(err) }),
            );
          }
          void next; // handled; do not fall through
        },
      );
    },
  };
}

/** Load KEY=VALUE pairs from .env.local into process.env (no dep needed). */
function loadEnvLocal() {
  const path = resolve(__dirname, '.env.local');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[m[1]] === undefined) process.env[m[1]] = val;
  }
}

/** Read and JSON-parse the request body (functions expect a parsed object). */
function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolvePromise) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c as Buffer));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolvePromise(undefined);
      try {
        resolvePromise(JSON.parse(raw));
      } catch {
        resolvePromise(raw);
      }
    });
    req.on('error', () => resolvePromise(undefined));
  });
}

/** Minimal VercelResponse shim over Node's ServerResponse. */
function makeRes(res: ServerResponse) {
  const api = {
    status(code: number) {
      res.statusCode = code;
      return api;
    },
    json(data: unknown) {
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'application/json');
      }
      res.end(JSON.stringify(data));
      return api;
    },
    send(data: string) {
      res.end(data);
      return api;
    },
    setHeader(name: string, value: string | string[]) {
      res.setHeader(name, value);
      return api;
    },
    redirect(url: string) {
      res.statusCode = 302;
      res.setHeader('Location', url);
      res.end();
      return api;
    },
  };
  return api;
}
