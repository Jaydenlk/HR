import express from 'express';
import { RedNoteTools } from './rednote-mcp/dist/tools/rednoteTools.js';

const app = express();
app.use(express.json());

const PORT = readPositiveInt(process.env.XHS_BRIDGE_PORT, 18060);
const REQUEST_TIMEOUT_MS = readPositiveInt(process.env.XHS_BRIDGE_TIMEOUT_MS, 45_000);
const INIT_TIMEOUT_MS = readPositiveInt(process.env.XHS_BRIDGE_INIT_TIMEOUT_MS, 60_000);
const MAX_RETRIES = readPositiveInt(process.env.XHS_BRIDGE_RETRIES, 1);
const DEFAULT_KEYWORD = '校招 面经';
const DEFAULT_LIMIT = 20;

let tools = new RedNoteTools();
let ready = false;
let initializing = false;
let lastError = null;

app.post('/api/v1/search_feeds', async (req, res) => {
  const { keyword = DEFAULT_KEYWORD, limit = DEFAULT_LIMIT } = req.body ?? {};
  try {
    await ensureReady();
    const notes = await retry(() => withTimeout(
      tools.searchNotes(keyword, limit),
      REQUEST_TIMEOUT_MS,
      `XHS search timed out after ${REQUEST_TIMEOUT_MS}ms`,
    ), MAX_RETRIES);

    res.json({
      feeds: notes.map((note) => ({
        title: note.title,
        desc: note.content,
        note_url: note.url,
        user: { nickname: note.author },
        liked_count: note.likes ?? 0,
      })),
    });
  } catch (error) {
    lastError = message(error);
    console.error('Search failed:', lastError);
    res.status(503).json({ error: lastError });
  }
});

app.get('/health', (_req, res) => {
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ok' : initializing ? 'initializing' : 'unavailable',
    last_error: lastError,
  });
});

app.listen(PORT, () => {
  console.log(`XHS bridge listening on http://localhost:${PORT}`);
  void ensureReady();
});

process.on('unhandledRejection', (error) => {
  lastError = message(error);
  ready = false;
  initializing = false;
  console.error('Unhandled rejection:', lastError);
});

async function ensureReady() {
  if (ready) return;
  if (initializing) {
    throw new Error('XHS bridge initializing');
  }

  initializing = true;
  lastError = null;
  try {
    console.log('Initializing RedNoteTools (loading cookies + browser)...');
    await retry(() => withTimeout(
      tools.initialize(),
      INIT_TIMEOUT_MS,
      `XHS bridge initialization timed out after ${INIT_TIMEOUT_MS}ms`,
    ), MAX_RETRIES);
    ready = true;
    console.log('Ready! XHS bridge is accepting requests.');
  } catch (error) {
    ready = false;
    tools = new RedNoteTools();
    lastError = message(error);
    console.error('Init failed:', lastError);
    throw error;
  } finally {
    initializing = false;
  }
}

async function retry(operation, retries) {
  let lastFailure;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastFailure = error;
      if (attempt < retries) {
        console.warn(`Attempt ${attempt + 1} failed: ${message(error)}; retrying`);
      }
    }
  }
  throw lastFailure;
}

async function withTimeout(promise, timeoutMs, errorMessage) {
  let timeout;
  const timeoutPromise = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeout);
  }
}

function readPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function message(error) {
  return error instanceof Error ? error.message : String(error);
}
