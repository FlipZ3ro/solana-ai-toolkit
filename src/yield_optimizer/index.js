import axios from 'axios';

const DEXSCREENER = 'https://api.dexscreener.com';

class YieldOptimizer {
  async scan() {
    const pools = await this.getPools();
    const analyzed = pools.map(p => {
      const apy = this.estimateAPY(p);
      const risk = this.assessRisk(p.tvl, apy);
      const score = this.score(p.tvl, apy, risk);
      return { ...p, apy, risk, score };
    }).sort((a, b) => b.score - a.score);

    return { timestamp: new Date().toISOString(), total: analyzed.length, topPicks: analyzed.slice(0, 10), summary: this.summary(analyzed) };
  }

  async getPools() {
    try {
      const { data } = await axios.get(`${DEXSCREENER}/pairs/solana?sort=liquidity`, { timeout: 10000 });
      return (data.pairs || []).slice(0, 50).map(p => ({
        protocol: p.dexId, pair: `${p.baseToken?.symbol}/${p.quoteToken?.symbol}`,
        tvl: p.liquidity?.usd || 0, volume24h: p.volume?.h24 || 0, change24h: p.priceChange?.h24 || 0
      }));
    } catch { return []; }
  }

  estimateAPY(p) {
    const tvl = p.tvl || 1;
    return Math.min(((p.volume24h * 0.003 / tvl) * 365 * 100), 1000);
  }

  assessRisk(tvl, apy) {
    if (tvl > 10e6 && apy < 20) return 'LOW';
    if (tvl > 1e6 && apy < 50) return 'MEDIUM';
    if (tvl > 1e5 && apy < 100) return 'HIGH';
    return 'DEGEN';
  }

  score(tvl, apy, risk) {
    let s = tvl > 10e6 ? 30 : tvl > 1e6 ? 25 : tvl > 5e5 ? 20 : tvl > 1e5 ? 15 : 5;
    s += apy > 50 ? 10 : apy > 20 ? 25 : apy > 10 ? 30 : apy > 5 ? 20 : 10;
    s += risk === 'LOW' ? 15 : risk === 'MEDIUM' ? 10 : risk === 'HIGH' ? 5 : -10;
    return Math.min(100, Math.max(0, s));
  }

  summary(pools) {
    return { safe: pools.filter(p => p.risk === 'LOW').length, medium: pools.filter(p => p.risk === 'MEDIUM').length, risky: pools.filter(p => p.risk === 'HIGH').length, degen: pools.filter(p => p.risk === 'DEGEN').length, avgAPY: pools.reduce((s, p) => s + p.apy, 0) / pools.length || 0 };
  }
}

export { YieldOptimizer };
