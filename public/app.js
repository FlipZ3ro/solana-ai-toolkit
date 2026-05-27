/* ── Solana AI Toolkit — Frontend Logic ── */

(() => {
  'use strict';

  // ── Helpers ──
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  function showLoading(container) {
    container.innerHTML = `<div class="loading"><div class="spinner"></div>Analyzing…</div>`;
  }

  function showError(container, msg) {
    container.innerHTML = `<div class="error-msg">⚠ ${escapeHtml(msg)}</div>`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function fmtNum(n, decimals = 2) {
    if (n == null) return '—';
    return Number(n).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  function fmtUsd(n) {
    if (n == null) return '—';
    if (Math.abs(n) >= 1e9) return '$' + fmtNum(n / 1e9) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + fmtNum(n / 1e6) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + fmtNum(n / 1e3) + 'K';
    return '$' + fmtNum(n);
  }

  function scoreBarClass(pct) {
    if (pct >= 70) return 'fill-green';
    if (pct >= 40) return 'fill-yellow';
    return 'fill-red';
  }

  function badgeForScore(score) {
    if (score >= 70) return '<span class="badge badge-safe">SAFE</span>';
    if (score >= 40) return '<span class="badge badge-warn">CAUTION</span>';
    return '<span class="badge badge-danger">RISKY</span>';
  }

  // ── API helpers ──
  async function apiGet(path) {
    const res = await fetch(path);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || body.message || `Server returned ${res.status}`);
    }
    return res.json();
  }

  async function apiPost(path, data) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || body.message || `Server returned ${res.status}`);
    }
    return res.json();
  }

  // ── Tab Navigation ──
  const tabs = $$('.tab');
  const panels = $$('.panel');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      panels.forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      $(`#panel-${target}`).classList.add('active');
    });
  });

  // ── Health Check ──
  async function checkHealth() {
    const dot = $('#statusDot');
    const txt = $('#statusText');
    try {
      const data = await apiGet('/api/health');
      if (data.status === 'ok' || data.status === 'healthy') {
        dot.className = 'status-dot online';
        txt.textContent = 'Connected';
      } else {
        dot.className = 'status-dot error';
        txt.textContent = 'Degraded';
      }
    } catch {
      dot.className = 'status-dot error';
      txt.textContent = 'Offline';
    }
  }

  // ── Rug Detector ──
  $('#rugForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const addr = $('#rugInput').value.trim();
    if (!addr) return;
    const out = $('#rugResults');
    showLoading(out);
    try {
      const data = await apiGet(`/api/rug/${encodeURIComponent(addr)}`);
      const score = data.safety_score ?? data.score ?? 0;
      const risk = data.risk_level ?? (score >= 70 ? 'Low' : score >= 40 ? 'Medium' : 'High');
      out.innerHTML = `
        <div class="score-card">
          <h3>${escapeHtml(data.name || data.token_name || addr.slice(0, 12))} ${badgeForScore(score)}</h3>
          <div class="score-bar-wrap">
            <div class="score-bar-label">
              <span>Safety Score</span>
              <span>${fmtNum(score, 0)} / 100</span>
            </div>
            <div class="score-bar">
              <div class="score-bar-fill ${scoreBarClass(score)}" style="width:${Math.min(score, 100)}%"></div>
            </div>
          </div>
          <div class="score-row"><span class="score-label">Risk Level</span><span class="score-value">${escapeHtml(risk)}</span></div>
          <div class="score-row"><span class="score-label">Liquidity</span><span class="score-value">${fmtUsd(data.liquidity ?? data.liquidity_usd)}</span></div>
          <div class="score-row"><span class="score-label">Holders</span><span class="score-value">${data.holder_count ?? data.holders ?? '—'}</span></div>
          <div class="score-row"><span class="score-label">Top Holder %</span><span class="score-value">${fmtNum(data.top_holder_pct ?? data.concentration, 1)}%</span></div>
          <div class="score-row"><span class="score-label">Contract Verified</span><span class="score-value">${data.contract_verified != null ? (data.contract_verified ? '✓ Yes' : '✗ No') : '—'}</span></div>
          ${data.flags && data.flags.length ? `<div class="score-row"><span class="score-label">Flags</span><span class="score-value">${data.flags.map(f => `<span class="badge badge-danger">${escapeHtml(f)}</span>`).join(' ')}</span></div>` : ''}
        </div>`;
    } catch (err) {
      showError(out, err.message);
    }
  });

  // ── Yield Optimizer ──
  $('#yieldForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const val = $('#yieldInput').value.trim();
    if (!val) return;
    const out = $('#yieldResults');
    showLoading(out);
    try {
      const data = await apiPost('/api/yield', { portfolio_value: Number(val), sol_amount: Number(val) });
      const pools = data.pools ?? data.opportunities ?? data.results ?? [];
      if (!pools.length) {
        out.innerHTML = '<div class="error-msg">No yield opportunities found.</div>';
        return;
      }
      let html = '';
      pools.forEach((p, i) => {
        const apy = p.apy ?? p.apr ?? 0;
        html += `
          <div class="score-card">
            <h3>${escapeHtml(p.name ?? p.protocol ?? `Pool ${i + 1}`)} <span class="badge badge-info">${fmtNum(apy, 1)}% APY</span></h3>
            <div class="score-bar-wrap">
              <div class="score-bar-label"><span>APY</span><span>${fmtNum(apy, 1)}%</span></div>
              <div class="score-bar">
                <div class="score-bar-fill fill-green" style="width:${Math.min(apy, 100)}%"></div>
              </div>
            </div>
            <div class="score-row"><span class="score-label">TVL</span><span class="score-value">${fmtUsd(p.tvl)}</span></div>
            <div class="score-row"><span class="score-label">Protocol</span><span class="score-value">${escapeHtml(p.protocol ?? p.platform ?? '—')}</span></div>
            <div class="score-row"><span class="score-label">Risk</span><span class="score-value">${escapeHtml(p.risk ?? p.risk_level ?? '—')}</span></div>
            <div class="score-row"><span class="score-label">Est. Daily</span><span class="score-value">${fmtUsd(p.daily_yield ?? p.estimated_daily)}</span></div>
          </div>`;
      });
      out.innerHTML = html;
    } catch (err) {
      showError(out, err.message);
    }
  });

  // ── Smart Money ──
  $('#smartMoneyBtn').addEventListener('click', async () => {
    const out = $('#smartResults');
    showLoading(out);
    try {
      const data = await apiGet('/api/smart-money');
      const wallets = data.wallets ?? data.results ?? [];
      if (!wallets.length) {
        out.innerHTML = '<div class="error-msg">No wallet data available.</div>';
        return;
      }
      let html = '';
      wallets.forEach((w) => {
        html += `
          <div class="wallet-card">
            <div>
              <div class="wallet-addr">${escapeHtml(w.address ?? w.wallet ?? '—')}</div>
              <div class="wallet-label">${escapeHtml(w.label ?? w.name ?? 'Whale')}</div>
            </div>
            <div style="text-align:right">
              <div class="wallet-stat">${fmtUsd(w.balance ?? w.sol_balance)}</div>
              <div class="wallet-label">${w.tx_count ?? w.transactions ?? '—'} txns</div>
            </div>
          </div>`;
      });
      out.innerHTML = html;
    } catch (err) {
      showError(out, err.message);
    }
  });

  // ── NFT Predictor ──
  $('#nftForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const addr = $('#nftInput').value.trim();
    if (!addr) return;
    const out = $('#nftResults');
    showLoading(out);
    try {
      const data = await apiGet(`/api/nft/${encodeURIComponent(addr)}`);
      const pred = data.predicted_price ?? data.predicted ?? data.floor_price ?? 0;
      const floor = data.floor_price ?? 0;
      const conf = data.confidence ?? data.confidence_score ?? 0;
      out.innerHTML = `
        <div class="score-card">
          <h3>${escapeHtml(data.name ?? data.collection ?? addr.slice(0, 12))} <span class="badge badge-info">AI Prediction</span></h3>
          <div class="score-bar-wrap">
            <div class="score-bar-label"><span>Confidence</span><span>${fmtNum(conf, 0)}%</span></div>
            <div class="score-bar">
              <div class="score-bar-fill fill-blue" style="width:${Math.min(conf, 100)}%"></div>
            </div>
          </div>
          <div class="score-row"><span class="score-label">Predicted Price</span><span class="score-value">${fmtUsd(pred)}</span></div>
          <div class="score-row"><span class="score-label">Floor Price</span><span class="score-value">${fmtUsd(floor)}</span></div>
          <div class="score-row"><span class="score-label">Volume (24h)</span><span class="score-value">${fmtUsd(data.volume_24h ?? data.daily_volume)}</span></div>
          <div class="score-row"><span class="score-label">Items</span><span class="score-value">${data.total_items ?? data.supply ?? '—'}</span></div>
          <div class="score-row"><span class="score-label">Owners</span><span class="score-value">${data.unique_owners ?? data.owners ?? '—'}</span></div>
          <div class="score-row"><span class="score-label">Trend</span><span class="score-value">${escapeHtml(data.trend ?? data.price_trend ?? '—')}</span></div>
        </div>`;
    } catch (err) {
      showError(out, err.message);
    }
  });

  // ── Init ──
  checkHealth();
})();
