import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function apiDevPlugin() {
  return {
    name: 'api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();

        // Parse body
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const bodyText = Buffer.concat(chunks).toString();
        try { req.body = JSON.parse(bodyText); } catch { req.body = {}; }

        // Resolve handler
        const apiPath = req.url.split('?')[0]; // e.g. /api/ai
        const modulePath = new URL('.' + apiPath + '.js', import.meta.url).pathname;

        // Shim Express-style helpers onto raw Node res
        res.status = (code) => { res.statusCode = code; return res; };
        res.json = (data) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        };

        try {
          // Bust cache so edits are picked up without restart
          const mod = await import(modulePath + '?t=' + Date.now());
          const handler = mod.default;
          if (typeof handler !== 'function') return next();
          await handler(req, res);
        } catch (err) {
          console.error('[api-dev]', err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load all env vars (including non-VITE_ ones) into process.env for API middleware
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [react(), tailwindcss(), apiDevPlugin()],
  };
})
