// ═══════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════
let state = { kawin: true, anak: 0 };

// TER tables (lower bound → rate)
const TER_A = [
  [0,0],[5400001,.0025],[5650001,.005],[5950001,.0075],[6300001,.01],
  [6750001,.0125],[7500001,.015],[8550001,.0175],[9650001,.02],[10050001,.0225],
  [10350001,.025],[10700001,.03],[11050001,.035],[11600001,.04],[12500001,.05],
  [13750001,.06],[15100001,.07],[16950001,.08],[19750001,.09],[24150001,.10],
  [26450001,.11],[28000001,.12],[30050001,.13],[32400001,.14],[35400001,.15],
  [39100001,.16],[43850001,.17],[47800001,.18],[51400001,.19],[56300001,.20],
  [62200001,.21],[68600001,.22],[77500001,.23],[89000001,.24],[103000001,.25],
  [125000001,.26],[157000001,.27],[206000001,.28],[337000001,.29],[454000001,.30],
  [550000001,.31],[695000001,.32],[910000001,.33],[1400000001,.34]
];
const TER_B = [
  [0,0],[6200001,.0025],[6500001,.005],[6850001,.0075],[7300001,.01],
  [9200001,.015],[10750001,.02],[11250001,.025],[11600001,.03],[12600001,.04],
  [13600001,.05],[14950001,.06],[16400001,.07],[18450001,.08],[21850001,.09],
  [26000001,.10],[27700001,.11],[29350001,.12],[31450001,.13],[33950001,.14],
  [37100001,.15],[41100001,.16],[45800001,.17],[49500001,.18],[53800001,.19],
  [58500001,.20],[64000001,.21],[71000001,.22],[80000001,.23],[93000001,.24],
  [109000001,.25],[129000001,.26],[163000001,.27],[211000001,.28],[374000001,.29],
  [459000001,.30],[555000001,.31],[704000001,.32],[957000001,.33],[1405000001,.34]
];
const TER_C = [
  [0,0],[6600001,.0025],[6950001,.005],[7350001,.0075],[7800001,.01],
  [8850001,.0125],[9800001,.015],[10950001,.0175],[11200001,.02],[12050001,.03],
  [12950001,.04],[14150001,.05],[15550001,.06],[17050001,.07],[19500001,.08],
  [22700001,.09],[26600001,.10],[28100001,.11],[30100001,.12],[32600001,.13],
  [35400001,.14],[38900001,.15],[43000001,.16],[47400001,.17],[51200001,.18],
  [55800001,.19],[60400001,.20],[66700001,.21]
];

const PTKP_MAP = {
  'TK/0':54000000,'TK/1':58500000,'TK/2':63000000,'TK/3':67500000,
  'K/0':58500000,'K/1':63000000,'K/2':67500000,'K/3':72000000
};
const KAT_MAP = {
  'TK/0':'A','TK/1':'A','TK/2':'B','TK/3':'B',
  'K/0':'A','K/1':'B','K/2':'B','K/3':'C'
};
const TER_TABLE = { A:TER_A, B:TER_B, C:TER_C };

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
function fmt(n) {
  if (n === null || n === undefined) return '—';
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}
function fmtShort(n) {
  if (!n) return 'Rp 0';
  if (Math.abs(n) >= 1e9) return 'Rp ' + (n/1e9).toFixed(1) + ' M';
  if (Math.abs(n) >= 1e6) return 'Rp ' + (n/1e6).toFixed(1) + ' jt';
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}
function parseRp(str) {
  return parseInt((str||'').replace(/[^\d]/g,'')) || 0;
}
function formatInput(el) {
  const raw = el.value.replace(/[^\d]/g,'');
  const num = parseInt(raw)||0;
  el.value = num ? num.toLocaleString('id-ID') : '';
}
function getTER(gaji, tbl) {
  let rate = 0;
  for (const [lb, r] of tbl) { if (gaji >= lb) rate = r; else break; }
  return rate;
}
function pph17(pkp) {
  if (pkp <= 0) return 0;
  let p = Math.min(pkp, 60e6) * 0.05;
  if (pkp > 60e6)   p += (Math.min(pkp, 250e6)  - 60e6)  * 0.15;
  if (pkp > 250e6)  p += (Math.min(pkp, 500e6)  - 250e6) * 0.25;
  if (pkp > 500e6)  p += (Math.min(pkp, 5000e6) - 500e6) * 0.30;
  if (pkp > 5000e6) p += (pkp - 5000e6) * 0.35;
  return p;
}

// ═══════════════════════════════════════════════════════════
// STATUS PTKP
// ═══════════════════════════════════════════════════════════
function getStatus() {
  const prefix = state.kawin ? 'K' : 'TK';
  return `${prefix}/${state.anak}`;
}
function setKawin(v) {
  state.kawin = v;
  document.getElementById('pillTK').classList.toggle('active', !v);
  document.getElementById('pillK').classList.toggle('active', v);
  updatePTKP(); resetResults();
}
function setAnak(n) {
  state.anak = n;
  [0,1,2,3].forEach(i => {
    document.getElementById(`pillA${i}`).classList.toggle('active', i === n);
  });
  updatePTKP(); resetResults();
}
function updatePTKP() {
  const s = getStatus();
  const ptkp = PTKP_MAP[s];
  const kat = KAT_MAP[s];
  document.getElementById('statusPTKP').textContent = s;
  document.getElementById('nilaiPTKP').textContent = fmt(ptkp) + ' / tahun';
  document.getElementById('katTER').textContent = 'Kategori ' + kat;
}

// ═══════════════════════════════════════════════════════════
// MAIN CALCULATION
// ═══════════════════════════════════════════════════════════
let lastResult = null;

function calc() {
  const bruto    = parseRp(document.getElementById('gajiBruto').value);
  const potongan = parseRp(document.getElementById('gajiNetto').value); // total potongan non-PPh

  if (!bruto) return;

  const status = getStatus();
  const ptkp   = PTKP_MAP[status];
  const kat    = KAT_MAP[status];
  const terTbl = TER_TABLE[kat];
  const thr    = bruto; // THR = 1× gaji

  // TER & PPh bulan biasa
  const terRate  = getTER(bruto, terTbl);
  const pphBulan = Math.round(bruto * terRate);
  const thpBulan = bruto - potongan - pphBulan;

  // TER & PPh bulan THR (bruto + THR = 2× bruto)
  const terTHR  = getTER(bruto + thr, terTbl);
  const pphTHR  = Math.round((bruto + thr) * terTHR);
  const thpTHR  = (bruto + thr) - potongan - pphTHR;

  // Total PPh Jan–Nov (10 bulan biasa + 1 bulan THR)
  const totalJanNov = pphBulan * 10 + pphTHR;

  // Neto setahun (dikurangi potongan non-PPh saja)
  const gajiTahun   = bruto * 12 + thr;
  const potonganThn = potongan * 12;
  const netoTahun   = gajiTahun - potonganThn;
  const pkpTahun    = Math.max(0, netoTahun - ptkp);
  const pphSetahun  = Math.round(pph17(pkpTahun));

  // PPh & THP Desember
  const pphDes = Math.max(0, pphSetahun - totalJanNov);
  const thpDes = bruto - potongan - pphDes;

  // Selisih PPh Des vs bln biasa
  const selisih = pphDes - pphBulan;

  lastResult = {
    bruto, potongan, status, ptkp, kat, terRate, terTHR,
    pphBulan, thpBulan, pphTHR, thpTHR,
    pphDes, thpDes, selisih, pphSetahun, pkpTahun,
    gajiTahun, netoTahun, potonganThn, totalJanNov, thr,
  };

  return lastResult;
}

function updateDeduction() {
  const bruto  = parseRp(document.getElementById('gajiBruto').value);
  const netto  = parseRp(document.getElementById('gajiNetto').value);
  const selisih = Math.max(0, bruto - netto);
  document.getElementById('dBruto').textContent    = fmt(bruto);
  document.getElementById('dPotongan').textContent = fmt(selisih);
  document.getElementById('dNetto').textContent    = fmt(netto);
}

function hideResults() {
  document.getElementById('inputLayout').classList.remove('hidden');
  document.getElementById('resultLayout').classList.remove('visible');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetResults() {
  hideResults();
  lastResult = null;
}

function showResults() {
  const r = calc();
  if (!r || !r.bruto) return;

  document.getElementById('resultSubtitle').textContent =
    `Status ${r.status} · Kategori TER ${r.kat} · Gaji ${fmtShort(r.bruto)}/bln`;

  // Result cards
  document.getElementById('rPphBulan').textContent = fmt(r.pphBulan);
  document.getElementById('rThpBulan').textContent = fmt(r.thpBulan);
  document.getElementById('rPphThr').textContent   = fmt(r.pphTHR);
  document.getElementById('rThpThr').textContent   = fmt(r.thpTHR);
  document.getElementById('rPphDes').textContent   = fmt(r.pphDes);
  document.getElementById('rThpDes').textContent   = fmt(r.thpDes);
  const arrowEl = document.getElementById('rThpDesArrow');
  if (r.thpDes > r.thpBulan) {
    arrowEl.textContent = '↑';
    arrowEl.className = 'rthp-arrow arrow-up';
  } else if (r.thpDes < r.thpBulan) {
    arrowEl.textContent = '↓';
    arrowEl.className = 'rthp-arrow arrow-down';
  } else {
    arrowEl.textContent = '';
    arrowEl.className = 'rthp-arrow';
  }

  // Summary
  document.getElementById('sTotalPph').textContent = fmt(r.pphSetahun);
  document.getElementById('sPkp').textContent      = fmt(r.pkpTahun);

  const selEl = document.getElementById('sSelisih');
  selEl.textContent = (r.selisih >= 0 ? '+' : '') + fmt(r.selisih).replace('Rp ','Rp ');
  selEl.className = 'sval ' + (r.selisih > 0 ? 'negative' : r.selisih < 0 ? 'positive' : '');
  document.getElementById('sSelisihRow').querySelector('.slabel').textContent =
    r.selisih > 0 ? 'PPh Des lebih besar dari bln biasa' : r.selisih < 0 ? 'PPh Des lebih kecil (kelebihan)' : 'PPh Des sama dengan bln biasa';

  // Savings
  renderSavings(r);

  // Switch view: hide input, show results
  document.getElementById('inputLayout').classList.add('hidden');
  document.getElementById('resultLayout').classList.add('visible');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderSavings(r) {
  const c = document.getElementById('savingsContainer');
  if (r.selisih > 0) {
    const sisih = Math.round(r.selisih / 11);
    const thpRata = r.bruto - r.potongan - Math.round(r.pphSetahun / 12);
    c.innerHTML = `
      <div class="savings-card need-save">
        <div class="savings-title">
          💡 Tabungan Pajak
          <span class="stag" style="color:var(--accent4)">REKOMENDASI</span>
        </div>
        <p class="savings-text">PPh Desember lebih besar dari bulan biasa. Sisihkan sebagian gaji tiap bulan agar Take Home Pay terasa sama sepanjang tahun.</p>
        <div class="savings-amount">
          <div>
            <div class="sa-label">Sisihkan per bulan (Jan–Nov)</div>
            <div class="sa-val">${fmt(sisih)}</div>
          </div>
        </div>
        <div style="margin-top:10px;background:rgba(255,255,255,.04);border-radius:10px;padding:10px 12px;">
          <div style="font-size:11px;color:var(--muted);margin-bottom:4px;">Take Home Pay rata-rata (jika pakai tabungan pajak)</div>
          <div style="font-size:16px;font-weight:700;color:var(--green);">${fmt(thpRata)}</div>
        </div>
      </div>`;
  } else if (r.selisih < 0) {
    c.innerHTML = `
      <div class="savings-card no-save">
        <div class="savings-title">
          ✅ Tidak Perlu Tabungan Pajak
          <span class="stag" style="color:var(--accent3)">INFO</span>
        </div>
        <p class="savings-text">PPh Desember lebih kecil dari bulan biasa. Artinya TER bulanan sedikit melebihi tarif efektif sebenarnya — kamu akan "menerima lebih" di bulan Desember.</p>
      </div>`;
  } else {
    c.innerHTML = `
      <div class="savings-card no-save">
        <div class="savings-title">⚖️ PPh Sama Setiap Bulan</div>
        <p class="savings-text">PPh Desember sama persis dengan bulan-bulan biasa. Tidak diperlukan penyesuaian.</p>
      </div>`;
  }
}

// ═══════════════════════════════════════════════════════════
// DETAIL PAGE
// ═══════════════════════════════════════════════════════════
function openDetail() {
  if (!lastResult) return;
  const r = lastResult;
  const body = document.getElementById('detailBody');

  function row(label, val, cls='', indent=false) {
    return `<div class="calc-row ${cls} ${indent?'indent':''}">
      <span class="clabel">${label}</span>
      <span class="cval">${val}</span>
    </div>`;
  }
  function subtotal(label, val, cls='') {
    return `<div class="calc-row subtotal ${cls}">
      <span class="clabel">${label}</span>
      <span class="cval">${val}</span>
    </div>`;
  }

  const pphLayers = (() => {
    const pkp = r.pkpTahun;
    let html = '';
    const l1 = Math.min(pkp, 60e6);
    if (l1 > 0) html += row(`5% × ${fmt(l1)} (s.d. Rp60 jt)`, fmt(l1*0.05), 'amber', true);
    if (pkp > 60e6) {
      const l2 = Math.min(pkp,250e6)-60e6;
      html += row(`15% × ${fmt(l2)} (Rp60–250 jt)`, fmt(l2*0.15), 'amber', true);
    }
    if (pkp > 250e6) {
      const l3 = Math.min(pkp,500e6)-250e6;
      html += row(`25% × ${fmt(l3)} (Rp250–500 jt)`, fmt(l3*0.25), 'amber', true);
    }
    if (pkp > 500e6) {
      const l4 = Math.min(pkp,5000e6)-500e6;
      html += row(`30% × ${fmt(l4)} (Rp500 jt–5 M)`, fmt(l4*0.30), 'red', true);
    }
    return html || row('PKP = 0, tidak terutang pajak', 'Rp 0', 'green', true);
  })();

  body.innerHTML = `
    <!-- Col 1: empty -->
    <div class="detail-col"></div>

    <!-- Col 2: purple info box + Bagian B -->
    <div class="detail-col">
      <!-- Info box -->
      <div style="background:rgba(124,92,252,.08);border:1px solid rgba(124,92,252,.2);border-radius:14px;padding:14px 16px;margin:16px 0;font-size:12px;color:var(--muted);line-height:1.7">
        <div style="font-weight:600;color:var(--accent1);margin-bottom:4px;">Input yang digunakan</div>
        Gaji bruto: <strong style="color:var(--text)">${fmt(r.bruto)}</strong> / bulan
        · Potongan: <strong style="color:var(--text)">${fmt(r.potongan)}</strong> / bulan
        · THR: <strong style="color:var(--text)">${fmt(r.thr)}</strong> (1× gaji)
        · Status: <strong style="color:var(--accent1)">${r.status}</strong>
        · Kategori TER: <strong style="color:var(--accent1)">${r.kat}</strong>
        · PTKP: <strong style="color:var(--text)">${fmt(r.ptkp)}</strong>/tahun
      </div>

      <!-- Bagian B -->
      <div class="detail-section">
        <div class="detail-section-title">Bagian B — Potongan Jan–Nov (TER)</div>

        <div class="detail-step open" onclick="toggleStep(this)">
          <div class="detail-step-header">
            <div class="step-num s1">1</div>
            <div class="step-title">PPh Bulan Biasa (Jan–Nov kecuali THR)</div>
            <div class="step-chevron">▼</div>
          </div>
          <div class="detail-step-body">
            ${row('Gaji bruto per bulan', fmt(r.bruto))}
            ${row('Tarif TER Kategori '+r.kat, (r.terRate*100).toFixed(2)+'%', 'highlight')}
            ${subtotal('PPh 21 per bulan = Bruto × TER', fmt(r.pphBulan), 'highlight')}
            ${row('× 10 bulan (Jan–Nov minus bln THR)', '×10')}
            ${subtotal('Total PPh 10 bulan biasa', fmt(r.pphBulan*10))}
            ${row('Take Home Pay per bulan', fmt(r.thpBulan), 'green')}
          </div>
        </div>

        <div class="detail-step" onclick="toggleStep(this)">
          <div class="detail-step-header">
            <div class="step-num s2">2</div>
            <div class="step-title">PPh Bulan THR (Maret — Gaji + THR)</div>
            <div class="step-chevron">▼</div>
          </div>
          <div class="detail-step-body">
            ${row('Gaji bruto bulan THR', fmt(r.bruto))}
            ${row('(+) THR = 1× gaji', fmt(r.thr))}
            ${subtotal('Penghasilan bruto bulan Maret', fmt(r.bruto + r.thr))}
            ${row('Tarif TER untuk bruto '+fmt(r.bruto+r.thr), (r.terTHR*100).toFixed(2)+'%', 'amber')}
            ${subtotal('PPh 21 bulan THR', fmt(r.pphTHR), 'amber')}
            ${row('Take Home Pay bulan THR', fmt(r.thpTHR), 'green')}
          </div>
        </div>

        <div class="detail-step" onclick="toggleStep(this)">
          <div class="detail-step-header">
            <div class="step-num s3">∑</div>
            <div class="step-title">Total PPh Dipotong Jan–Nov</div>
            <div class="step-chevron">▼</div>
          </div>
          <div class="detail-step-body">
            ${row('PPh 10 bulan biasa', fmt(r.pphBulan*10))}
            ${row('(+) PPh bulan THR', fmt(r.pphTHR))}
            ${subtotal('Total PPh Jan–Nov', fmt(r.totalJanNov), 'highlight')}
          </div>
        </div>
      </div>
    </div>

    <!-- Col 3: Bagian C -->
    <div class="detail-col">
      <div class="detail-section" style="margin-top:16px;">
        <div class="detail-section-title">Bagian C — Rekonsiliasi Desember (Pasal 17)</div>

        <div class="detail-step" onclick="toggleStep(this)">
          <div class="detail-step-header">
            <div class="step-num s1">3</div>
            <div class="step-title">Langkah 1 — Hitung Neto Setahun</div>
            <div class="step-chevron">▼</div>
          </div>
          <div class="detail-step-body">
            ${row('Gaji bruto setahun (×12)', fmt(r.bruto*12))}
            ${row('(+) THR', fmt(r.thr))}
            ${subtotal('Total penghasilan bruto setahun', fmt(r.gajiTahun))}
            ${row('(−) Total potongan setahun (ip+asuransi×12)', fmt(r.potonganThn), 'red')}
            ${subtotal('Penghasilan neto setahun', fmt(r.netoTahun))}
          </div>
        </div>

        <div class="detail-step" onclick="toggleStep(this)">
          <div class="detail-step-header">
            <div class="step-num s2">4</div>
            <div class="step-title">Langkah 2 — Hitung PKP</div>
            <div class="step-chevron">▼</div>
          </div>
          <div class="detail-step-body">
            ${row('Penghasilan neto setahun', fmt(r.netoTahun))}
            ${row('(−) PTKP status '+r.status, fmt(r.ptkp), 'red')}
            ${subtotal('Penghasilan Kena Pajak (PKP)', fmt(r.pkpTahun), 'highlight')}
          </div>
        </div>

        <div class="detail-step" onclick="toggleStep(this)">
          <div class="detail-step-header">
            <div class="step-num s3">5</div>
            <div class="step-title">Langkah 3 — PPh Pasal 17 (Tarif Progresif)</div>
            <div class="step-chevron">▼</div>
          </div>
          <div class="detail-step-body">
            ${pphLayers}
            ${subtotal('PPh Pasal 21 Setahun', fmt(r.pphSetahun), 'amber')}
          </div>
        </div>

        <div class="detail-step" onclick="toggleStep(this)">
          <div class="detail-step-header">
            <div class="step-num s4">6</div>
            <div class="step-title">Langkah 4 — PPh Desember</div>
            <div class="step-chevron">▼</div>
          </div>
          <div class="detail-step-body">
            ${row('PPh Pasal 21 setahun', fmt(r.pphSetahun))}
            ${row('(−) PPh sudah dipotong Jan–Nov', fmt(r.totalJanNov), 'red')}
            ${subtotal('PPh Desember (rekonsiliasi)', fmt(r.pphDes), r.selisih > 0 ? 'red' : 'green')}
            ${row('Take Home Pay Desember', fmt(r.thpDes), r.selisih > 0 ? 'red' : 'green')}
          </div>
        </div>
      </div>
    </div>

    <!-- Col 4: empty -->
    <div class="detail-col"></div>
  `;

  document.getElementById('detailPage').classList.add('open');
  document.getElementById('detailPage').scrollTop = 0;
}

function closeDetail() {
  document.getElementById('detailPage').classList.remove('open');
}

function toggleStep(el) {
  el.classList.toggle('open');
}

// ═══════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════
updatePTKP();
updateDeduction(); // Show deduction bar on load
// No auto-calc on load — user must press Hitung
