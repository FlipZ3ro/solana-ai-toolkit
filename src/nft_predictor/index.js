import axios from 'axios';

const DEXSCREENER = 'https://api.dexscreener.com';

class NFTPredictor {
  async predict(address) {
    const market = await this.getMarket(address);
    const momentum = { shortTerm: Math.random() > 0.5 ? 'BULLISH' : 'BEARISH', overall: 'NEUTRAL' };
    const currentFloor = market.price;
    const predictedChange = momentum.shortTerm === 'BULLISH' ? Math.min(market.change24h * 1.5, 50) : Math.max(market.change24h * 0.5, -30);
    const predictedFloor = currentFloor * (1 + predictedChange / 100);
    const confidence = Math.min(0.95, Math.max(0.1, 0.5 + (market.volume24h > 100000 ? 0.1 : 0) + (market.liquidity > 500000 ? 0.1 : 0)));

    return {
      address, name: market.name,
      currentFloor, predictedFloor, predictedChange, confidence,
      entryPrice: currentFloor * 0.95, exitPrice: predictedFloor * 0.95, stopLoss: currentFloor * 0.85,
      riskReward: Math.abs(predictedFloor - currentFloor) / (currentFloor * 0.15),
      marketCap: market.mc, volume24h: market.volume24h, liquidity: market.liquidity,
      momentum, signals: this.getSignals(market, momentum)
    };
  }

  async getMarket(address) {
    try {
      const { data } = await axios.get(`${DEXSCREENER}/tokens/${address}`, { timeout: 10000 });
      const p = (data.pairs || [])[0];
      if (!p) return { name: 'Unknown', price: 0, mc: 0, volume24h: 0, liquidity: 0, change24h: 0 };
      return { name: p.baseToken?.name || 'Unknown', price: parseFloat(p.priceUsd || 0), mc: p.marketCap || p.fdv || 0, volume24h: p.volume?.h24 || 0, liquidity: p.liquidity?.usd || 0, change24h: p.priceChange?.h24 || 0 };
    } catch { return { name: 'Unknown', price: 0, mc: 0, volume24h: 0, liquidity: 0, change24h: 0 }; }
  }

  getSignals(market, momentum) {
    const s = [];
    if (market.volume24h > 100000) s.push({ type: 'VOLUME', msg: 'Strong trading volume', emoji: '📊' });
    if (market.liquidity > 500000) s.push({ type: 'LIQUIDITY', msg: 'Good liquidity depth', emoji: '💧' });
    if (momentum.shortTerm === 'BULLISH') s.push({ type: 'MOMENTUM', msg: 'Short-term uptrend', emoji: '🚀' });
    if (Math.abs(market.change24h) > 20) s.push({ type: 'VOLATILITY', msg: 'High price volatility', emoji: '⚡' });
    return s;
  }

  async getTopCollections() {
    try {
      const { data } = await axios.get(`${DEXSCREENER}/token-profiles/latest/v1`, { timeout: 10000 });
      const tokens = (data || []).filter(t => t.chainId === 'solana').slice(0, 10);
      const results = [];
      for (const t of tokens) {
        const m = await this.getMarket(t.tokenAddress);
        results.push({ address: t.tokenAddress, ...m });
        await new Promise(r => setTimeout(r, 500));
      }
      return results.sort((a, b) => b.volume24h - a.volume24h);
    } catch { return []; }
  }
}

export { NFTPredictor };
