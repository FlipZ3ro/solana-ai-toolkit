import axios from 'axios';

const RPC_URL = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
const DEXSCREENER = 'https://api.dexscreener.com';

class SmartMoneyTracker {
  async track(address) {
    const [tokens, activity] = await Promise.all([
      this.getHoldings(address),
      this.getActivity(address)
    ]);
    const signals = [];
    if (activity.txCount > 10) signals.push({ type: 'ACTIVE', msg: 'High activity wallet', emoji: '🔥' });
    if (tokens.length > 5) signals.push({ type: 'DIVERSIFIED', msg: 'Diversified portfolio', emoji: '💼' });
    const copyWorthy = signals.some(s => s.type === 'ACTIVE');
    return { address, tokens, activity, signals, copyWorthy };
  }

  async getHoldings(address) {
    try {
      const { data } = await axios.post(RPC_URL, {
        jsonrpc: '2.0', id: 1, method: 'getTokenAccountsByOwner',
        params: [address, { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' }, { encoding: 'jsonParsed' }]
      }, { timeout: 15000 });

      const accounts = (data?.result?.value || []).filter(a => {
        const amt = parseFloat(a.account?.data?.parsed?.info?.tokenAmount?.uiAmount || 0);
        return amt > 0;
      }).slice(0, 10);

      const result = [];
      for (const a of accounts) {
        const info = a.account.data.parsed.info;
        const mint = info.mint;
        const amount = parseFloat(info.tokenAmount.uiAmount);
        const tokenData = await this.getTokenInfo(mint);
        result.push({ mint, amount, ...tokenData });
        await new Promise(r => setTimeout(r, 500));
      }
      return result;
    } catch { return []; }
  }

  async getTokenInfo(mint) {
    try {
      const { data } = await axios.get(`${DEXSCREENER}/tokens/${mint}`, { timeout: 10000 });
      const p = (data.pairs || [])[0];
      if (!p) return { symbol: 'Unknown', price: 0 };
      return { symbol: p.baseToken?.symbol || 'Unknown', price: parseFloat(p.priceUsd || 0), change24h: p.priceChange?.h24 || 0 };
    } catch { return { symbol: 'Unknown', price: 0 }; }
  }

  async getActivity(address) {
    try {
      const { data } = await axios.post(RPC_URL, {
        jsonrpc: '2.0', id: 1, method: 'getSignaturesForAddress',
        params: [address, { limit: 20 }]
      }, { timeout: 10000 });
      return { txCount: (data?.result || []).length, lastTx: data?.result?.[0]?.blockTime };
    } catch { return { txCount: 0, lastTx: null }; }
  }

  async getTopMovers() {
    try {
      const { data } = await axios.get(`${DEXSCREENER}/pairs/solana?sort=priceChange`, { timeout: 10000 });
      return (data.pairs || [])
        .filter(p => Math.abs(p.priceChange?.h24 || 0) > 20)
        .slice(0, 10)
        .map(p => ({ pair: `${p.baseToken?.symbol}/${p.quoteToken?.symbol}`, change24h: p.priceChange?.h24, volume: p.volume?.h24, liquidity: p.liquidity?.usd }));
    } catch { return []; }
  }
}

export { SmartMoneyTracker };
