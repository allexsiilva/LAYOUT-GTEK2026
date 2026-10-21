import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // In-memory cache for the last successful rate
  let lastKnownRate = 5.85;
  let lastCacheTime = 0;

  // API route to proxy currency rate requests
  app.get("/api/rate", async (req, res) => {
    // If cache is fresh (less than 1 min), return it
    if (Date.now() - lastCacheTime < 60000) {
      return res.json({ USDBRL: { bid: String(lastKnownRate) }, isRealTime: true, cached: true });
    }

    const sources = [
      { url: 'https://economia.awesomeapi.com.br/json/last/USD-BRL', parser: (d: any) => d.USDBRL? d.USDBRL.bid : null },
      { url: 'https://open.er-api.com/v6/latest/USD', parser: (d: any) => d.rates?.BRL },
      { url: 'https://api.exchangerate-api.com/v4/latest/USD', parser: (d: any) => d.rates?.BRL }
    ];

    const fetchWithRetry = async (source: any, retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);
          
          const response = await fetch(source.url, {
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const data = await response.json();
            const rate = source.parser(data);
            if (rate && !isNaN(rate)) {
              lastKnownRate = Number(rate);
              lastCacheTime = Date.now();
              return lastKnownRate;
            }
          }
        } catch (e) {
          if (i === retries - 1) throw e;
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential-ish backoff
        }
      }
      return null;
    };

    for (const source of sources) {
      try {
        const rate = await fetchWithRetry(source);
        if (rate) {
          return res.json({ USDBRL: { bid: String(rate) }, isRealTime: true });
        }
      } catch (e) {
        console.error(`Error fetching from ${source.url}:`, e instanceof Error ? e.message : String(e));
      }
    }

    // Default fallback with a reasonably fresh rate if all sources fail
    console.warn('All currency sources failed, using fallback rate.');
    res.json({ 
      USDBRL: { bid: "5.85" }, 
      isRealTime: false, 
      warning: 'Note: Using safety fallback due to service maintenance.' 
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
