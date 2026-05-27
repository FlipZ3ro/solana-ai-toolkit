import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { RugDetector } from './src/rug_detector/index.js';
import { YieldOptimizer } from './src/yield_optimizer/index.js';
import { SmartMoneyTracker } from './src/smart_money/index.js';
import { NFTPredictor } from './src/nft_predictor/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Initialize modules
const rug = new RugDetector();
const yieldOpt = new YieldOptimizer();
const smart = new SmartMoneyTracker();
const nft = new NFTPredictor();

// Middleware
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));

// Serve static files from public/
app.use(express.static(join(__dirname, 'public')));

// Health
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Rug Detection
app.post('/api/rug/analyze', async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) return res.status(400).json({ error: 'Token address required' });
    const result = await rug.analyze(address);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/rug/scan', async (_req, res) => {
  try {
    const result = await rug.scanRecent();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Yield
app.get('/api/yield/scan', async (_req, res) => {
  try {
    const result = await yieldOpt.scan();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Smart Money
app.post('/api/smart/track', async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) return res.status(400).json({ error: 'Wallet address required' });
    const result = await smart.track(address);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/smart/top-movers', async (_req, res) => {
  try {
    const result = await smart.getTopMovers();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NFT
app.post('/api/nft/predict', async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) return res.status(400).json({ error: 'Collection address required' });
    const result = await nft.predict(address);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/nft/top', async (_req, res) => {
  try {
    const result = await nft.getTopCollections();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SPA fallback - serve index.html for non-API routes
app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 4200;
  app.listen(PORT, () => {
    console.log(`\n🚀 Solana AI Toolkit running on http://localhost:${PORT}\n`);
  });
}

// Export for Vercel serverless
export default app;
