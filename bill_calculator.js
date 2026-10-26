let currentMode = 'readings';
let currentTariff = null;
let lastCalculatedResult = null;

const DEFAULT_SLABS = [
  { from: 0, to: 100, rate: 3.75 },
  { from: 101, to: 300, rate: 6.50 },
  { from: 301, to: 500, rate: 8.75 },
  { from: 501, to: 999999, rate: 11.20 }
];

document.addEventListener('DOMContentLoaded', () => {
  loadTariffConfig();
  calculateUnitsFromReadings();
});

async function loadTariffConfig() {
  try {
    const res = await fetch('/api/tariff');
    if (res.ok) {
      currentTariff = await res.json();
      if (currentTariff.rate_type === 'flat') {
        document.getElementById('tariff-type').value = 'flat';
        document.getElementById('flat-rate').value = currentTariff.flat_rate || 7.0;
      } else {
        document.getElementById('tariff-type').value = 'slab';
      }
      document.getElementById('fixed-charge').value = currentTariff.fixed_charge || 60.0;
      document.getElementById('tax-percent').value = currentTariff.tax_percent || 6.0;
      toggleTariffType();
    }
  } catch (e) {
    console.error('Could not load tariff from API, using defaults', e);
  }
}

function setMode(mode) {
  currentMode = mode;
  const btnReadings = document.getElementById('btn-mode-readings');
  const btnUnits = document.getElementById('btn-mode-units');
  const secReadings = document.getElementById('section-readings');
  const secUnits = document.getElementById('section-units');

  if (mode === 'readings') {
    btnReadings.className = 'btn btn-outline-emerald btn-sm';
    btnUnits.className = 'btn btn-secondary btn-sm';
    secReadings.style.display = 'block';
    secUnits.style.display = 'none';
    calculateUnitsFromReadings();
  } else {
    btnUnits.className = 'btn btn-outline-emerald btn-sm';
    btnReadings.className = 'btn btn-secondary btn-sm';
    secUnits.style.display = 'block';
    secReadings.style.display = 'none';
    triggerRecalculation();
  }
}

function toggleTariffType() {
  const type = document.getElementById('tariff-type').value;
  const flatFields = document.getElementById('tariff-flat-fields');
  const slabFields = document.getElementById('tariff-slab-fields');
  const slabCard = document.getElementById('slab-breakdown-card');

  if (type === 'flat') {
    flatFields.style.display = 'block';
    slabFields.style.display = 'none';
    slabCard.style.display = 'none';
  } else {
    flatFields.style.display = 'none';
    slabFields.style.display = 'block';
    slabCard.style.display = 'block';
  }
  triggerRecalculation();
}

function calculateUnitsFromReadings() {
  const prev = parseFloat(document.getElementById('prev-reading').value) || 0;
  const curr = parseFloat(document.getElementById('curr-reading').value) || 0;
  const diff = Math.max(0, curr - prev);
  document.getElementById('reading-diff-label').innerText = `${diff.toFixed(2)} kWh`;
  triggerRecalculation();
}

function getActiveUnits() {
  if (currentMode === 'readings') {
    const prev = parseFloat(document.getElementById('prev-reading').value) || 0;
    const curr = parseFloat(document.getElementById('curr-reading').value) || 0;
    return Math.max(0, curr - prev);
  } else {
    return parseFloat(document.getElementById('direct-units').value) || 0;
  }
}

async function triggerRecalculation() {
  const units = getActiveUnits();
  const tariffType = document.getElementById('tariff-type').value;
  const flatRate = parseFloat(document.getElementById('flat-rate').value) || 7.0;
  const fixedCharge = parseFloat(document.getElementById('fixed-charge').value) || 60.0;
  const taxPercent = parseFloat(document.getElementById('tax-percent').value) || 6.0;

  const payload = {
    units: units,
    rate_type: tariffType,
    flat_rate: flatRate,
    fixed_charge: fixedCharge,
    tax_percent: taxPercent,
    slabs: DEFAULT_SLABS
  };

  try {
    const res = await fetch('/api/calculate-bill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Calculation error');
    const result = await res.json();
    lastCalculatedResult = result;
    renderBillResult(result);
    compareActualBill();
  } catch (err) {
    console.error(err);
  }
}

function renderBillResult(result) {
  document.getElementById('bill-units-badge').innerText = `${result.units} Units (kWh)`;
  document.getElementById('result-total-bill').innerText = formatCurrency(result.total_amount);
  document.getElementById('result-effective-rate').innerText = `Effective Rate: ₹${result.effective_rate.toFixed(2)} per kWh`;

  document.getElementById('result-energy-charge').innerText = formatCurrency(result.energy_charge);
  document.getElementById('result-fixed-charge').innerText = formatCurrency(result.fixed_charge);
  document.getElementById('result-tax-pct').innerText = `${result.tax_percent}%`;
  document.getElementById('result-tax-amount').innerText = formatCurrency(result.tax_amount);

  // Render Slab breakdown
  const tbody = document.getElementById('slab-breakdown-tbody');
  if (tbody) {
    if (result.slab_breakdown && result.slab_breakdown.length > 0) {
      let html = '';
      result.slab_breakdown.forEach(s => {
        html += `
          <tr>
            <td><strong>${s.range}</strong></td>
            <td>₹${s.rate.toFixed(2)}</td>
            <td>${s.units} kWh</td>
            <td><strong>${formatCurrency(s.cost)}</strong></td>
          </tr>
        `;
      });
      tbody.innerHTML = html;
    } else {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Flat tariff selected (no tiered breakdown)</td></tr>`;
    }
  }
}

function compareActualBill() {
  const actualInput = document.getElementById('actual-bill').value;
  const banner = document.getElementById('comparison-banner');
  if (!banner || !lastCalculatedResult) return;

  if (!actualInput || parseFloat(actualInput) <= 0) {
    banner.style.display = 'none';
    return;
  }

  const actual = parseFloat(actualInput);
  const estimated = lastCalculatedResult.total_amount;
  const diff = actual - estimated;
  const pct = ((Math.abs(diff) / estimated) * 100).toFixed(1);

  banner.style.display = 'block';

  if (Math.abs(diff) < 5) {
    banner.style.background = 'rgba(16, 185, 129, 0.15)';
    banner.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    banner.innerHTML = `
      <div style="color: var(--accent-emerald-light); font-weight: 700;">🎯 Spot-on Estimation!</div>
      <div style="font-size: 0.85rem; color: #d1fae5; margin-top: 2px;">Your actual bill (${formatCurrency(actual)}) matches our calculated estimate (${formatCurrency(estimated)}) within ₹5 margin.</div>
    `;
  } else if (diff > 0) {
    banner.style.background = 'rgba(244, 63, 94, 0.15)';
    banner.style.borderColor = 'rgba(244, 63, 94, 0.4)';
    banner.innerHTML = `
      <div style="color: var(--accent-rose); font-weight: 700;">⚠️ Actual Bill Higher by ${formatCurrency(diff)} (+${pct}%)</div>
      <div style="font-size: 0.85rem; color: #fecdd3; margin-top: 2px;">Actual amount exceeds our appliance estimate. Probable reasons: unmetered standby loads, unlisted appliances, or fuel surcharge adjustments.</div>
    `;
  } else {
    banner.style.background = 'rgba(6, 182, 212, 0.15)';
    banner.style.borderColor = 'rgba(6, 182, 212, 0.4)';
    banner.innerHTML = `
      <div style="color: var(--accent-cyan); font-weight: 700;">🎉 Under Budget by ${formatCurrency(Math.abs(diff))} (-${pct}%)</div>
      <div style="font-size: 0.85rem; color: #cffafe; margin-top: 2px;">Actual amount was lower than expected. Your conservative usage paid off!</div>
    `;
  }
}

async function loadFromRegisteredAppliances() {
  try {
    const res = await fetch('/api/dashboard-data');
    if (!res.ok) throw new Error('Failed to fetch appliances data');
    const data = await res.json();
    setMode('units');
    document.getElementById('direct-units').value = data.total_kwh;
    triggerRecalculation();
    showToast(`Loaded ${data.total_kwh} kWh from your registered appliances!`, 'info');
  } catch (e) {
    showToast('Failed to auto-fill: ' + e.message, 'error');
  }
}

async function saveCalculatedBill() {
  if (!lastCalculatedResult) {
    showToast('No calculated bill to save', 'error');
    return;
  }

  const period = document.getElementById('billing-period').value || 'Current Month';
  const actualVal = parseFloat(document.getElementById('actual-bill').value) || lastCalculatedResult.total_amount;
  const prevVal = currentMode === 'readings' ? parseFloat(document.getElementById('prev-reading').value) || 0 : 0;
  const currVal = currentMode === 'readings' ? parseFloat(document.getElementById('curr-reading').value) || 0 : 0;

  const payload = {
    billing_period: period,
    prev_reading: prevVal,
    curr_reading: currVal,
    units_consumed: lastCalculatedResult.units,
    tariff_rate: lastCalculatedResult.effective_rate,
    fixed_charge: lastCalculatedResult.fixed_charge,
    tax_amount: lastCalculatedResult.tax_amount,
    estimated_amount: lastCalculatedResult.total_amount,
    actual_amount: actualVal,
    notes: 'Saved from Bill Estimator'
  };

  try {
    const res = await fetch('/api/save-bill-record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Save failed');
    showToast(data.message);
  } catch (err) {
    showToast(err.message, 'error');
  }
}
