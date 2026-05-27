import 'dotenv/config';
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
const PORT = process.env.PORT || 4200;

// Initialize modules
const rug = new RugDetector();
const yieldOpt = new YieldOptimizer();
const smart = new SmartMoneyTracker();
const nft = new NFTPredictor();

// Middleware
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(join(__dirname, 'public')));

// Health
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});

// Rug Detection
app.post('/api/rug/analyze', async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) return res.status(400).json({ error: 'Token address required' });
    const result = await rug.analyze(address);
    res.json(result);
  } catch (err) {
    console.error('[rug/analyze]', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/rug/scan', async (_req, res) => {
  try {
    const result = await rug.scanRecent();
    res.json(result);
  } catch (err) {
    console.error('[rug/scan]', err);
    res.status(500).json({ error: err.message });
  }
});

// Yield
app.get('/api/yield/scan', async (_req, res) => {
  try {
    const result = await yieldOpt.scan();
    res.json(result);
  } catch (err) {
    console.error('[yield/scan]', err);
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
    console.error('[smart/track]', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/smart/top-movers', async (_req, res) => {
  try {
    const result = await smart.getTopMovers();
    res.json(result);
  } catch (err) {
    console.error('[smart/top-movers]', err);
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
    console.error('[nft/predict]', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/nft/top', async (_req, res) => {
  try {
    const result = await nft.getTopCollections();
    res.json(result);
  } catch (err) {
    console.error('[nft/top]', err);
    res.status(500).json({ error: err.message });
  }
});

// SPA fallback
app.get('/{*splat}', (_req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 Solana AI Toolkit running on http://localhost:${PORT}\n`);
});
