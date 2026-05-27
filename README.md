# 🤖 Solana AI Toolkit

AI-powered crypto toolkit for Solana blockchain.

## Features

- **🔍 Rug Detector** — Token risk analysis, honeypot detection, risk score
- **💰 Yield Optimizer** — DeFi yield scanning, APY estimation, auto-ranking
- **🐋 Smart Money Tracker** — Whale wallet tracking, copy trade signals
- **🎨 NFT Floor Predictor** — AI predictions, entry/exit signals

## Quick Start

```bash
git clone https://github.com/FlipZ3ro/solana-ai-toolkit.git
cd solana-ai-toolkit
npm install
cp .env.example .env
# Edit .env with your RPC endpoint
npm start
```

Open http://localhost:4200

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/rug/analyze` | POST | Analyze token (body: `{address}`) |
| `/api/rug/scan` | GET | Scan recent tokens |
| `/api/yield/scan` | GET | Scan yield opportunities |
| `/api/smart/track` | POST | Track wallet (body: `{address}`) |
| `/api/smart/top-movers` | GET | Top price movers |
| `/api/nft/predict` | POST | Predict NFT floor (body: `{address}`) |
| `/api/nft/top` | GET | Top collections |
| `/api/health` | GET | Health check |

## License

MIT
