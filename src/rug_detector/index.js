import axios from 'axios';

const RPC_URL = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
const DEXSCREENER = 'https://api.dexscreener.com';

class RugDetector {
  async analyze(address) {
    const dex = await this.getDex(address);
    if (!dex) return { error: 'Token not found', address };

    const risks = [];
    if (dex.liquidity < 10000) risks.push({ type: 'LIQUIDITY', level: 'HIGH', msg: `Low liquidity: $${dex.liquidity.toFixed(0)}` });
    if (dex.volume24h < 50000) risks.push({ type: 'VOLUME', level: 'MEDIUM', msg: `Low volume: $${dex.volume24h.toFixed(0)}` });
    if (dex.pairAge && dex.pairAge < 1) risks.push({ type: 'AGE', level: 'HIGH', msg: `Very new: ${dex.pairAge.toFixed(1)}h` });
    if (Math.abs(dex.change24h) > 100) risks.push({ type: 'VOLATILITY', level: 'HIGH', msg: `Extreme move: ${dex.change24h}%` });

    // On-chain checks
    try {
      const { data } = await axios.post(RPC_URL, {
        jsonrpc: '2.0', id: 1, method: 'getAccountInfo',
        params: [address, { encoding: 'jsonParsed' }]
      }, { timeout: 10000 });

      const info = data?.result?.value?.data?.parsed?.info;
      if (info?.mintAuthority) risks.push({ type: 'MINT', level: 'CRITICAL', msg: 'Mint authority active!' });
      if (info?.freezeAuthority) risks.push({ type: 'FREEZE', level: 'HIGH', msg: 'Freeze authority active!' });
    } catch {}

    let score = 100;
    for (const r of risks) {
      if (r.level === 'CRITICAL') score -= 40;
      else if (r.level === 'HIGH') score -= 25;
      else if (r.level === 'MEDIUM') score -= 10;
    }
    score = Math.max(0, Math.min(100, score));

    const verdict = score >= 80 ? 'SAFE' : score >= 60 ? 'CAUTION' : score >= 40 ? 'RISKY' : 'DANGER';
    return { address, symbol: dex.symbol, name: dex.name, price: dex.price, mc: dex.mc, liquidity: dex.liquidity, volume24h: dex.volume24h, change24h: dex.change24h, pairAge: dex.pairAge, risks, score, verdict };
  }

  async getDex(address) {
    try {
      const { data } = await axios.get(`${DEXSCREENER}/tokens/${address}`, { timeout: 10000 });
      const p = (data.pairs || [])[0];
      if (!p) return null;
      const age = p.pairCreatedAt ? (Date.now() - p.pairCreatedAt) / 3600000 : null;
      return { symbol: p.baseToken?.symbol, name: p.baseToken?.name, price: parseFloat(p.priceUsd || 0), mc: p.marketCap || p.fdv || 0, liquidity: p.liquidity?.usd || 0, volume24h: p.volume?.h24 || 0, change24h: p.priceChange?.h24 || 0, pairAge: age };
    } catch { return null; }
  }

  async scanRecent() {
    try {
      const { data } = await axios.get(`${DEXSCREENER}/token-profiles/latest/v1`, { timeout: 10000 });
      const tokens = (data || []).filter(t => t.chainId === 'solana').slice(0, 5);
      const results = [];
      for (const t of tokens) {
        results.push(await this.analyze(t.tokenAddress));
        await new Promise(r => setTimeout(r, 1000));
      }
      return results;
    } catch { return []; }
  }
}

export { RugDetector };
