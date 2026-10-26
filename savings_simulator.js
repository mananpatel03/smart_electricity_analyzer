let appliancesList = [];
let selectedAppliance = null;

document.addEventListener('DOMContentLoaded', () => {
  initSimulator();
});

async function initSimulator() {
  try {
    const res = await fetch('/api/dashboard-data');
    if (!res.ok) throw new Error('Failed to load appliances');
    const data = await res.json();
    appliancesList = data.appliances || [];

    populateSelect();
    renderSmartTips(data.tips || []);

    // Check URL param ?appliance=ID
    const urlParams = new URLSearchParams(window.location.search);
    const preselectedId = urlParams.get('appliance');
    if (preselectedId) {
      const select = document.getElementById('sim-appliance-select');
      select.value = preselectedId;
      onSelectAppliance();
    } else if (appliancesList.length > 0) {
      document.getElementById('sim-appliance-select').value = appliancesList[0].id;
      onSelectAppliance();
    }
  } catch (err) {
    console.error(err);
    showToast('Failed to initialize simulator: ' + err.message, 'error');
  }
}

function populateSelect() {
  const select = document.getElementById('sim-appliance-select');
  select.innerHTML = '<option value="">-- Choose registered appliance --</option>';

  appliancesList.forEach(app => {
    const opt = document.createElement('option');
    opt.value = app.id;
    opt.innerText = `${app.name} (${app.power_watts}W, ${app.hours_per_day}h/day - ${app.total_kwh} kWh/mo)`;
    select.appendChild(opt);
  });
}

function onSelectAppliance() {
  const select = document.getElementById('sim-appliance-select');
  const appId = parseInt(select.value);
  selectedAppliance = appliancesList.find(a => a.id === appId);

  const profileDiv = document.getElementById('sim-current-profile');
  if (!selectedAppliance) {
    profileDiv.style.display = 'none';
    return;
  }

  profileDiv.style.display = 'block';
  document.getElementById('curr-watts-label').innerText = `${selectedAppliance.power_watts} W`;
  document.getElementById('curr-hours-label').innerText = `${selectedAppliance.hours_per_day} hrs/day`;
  document.getElementById('curr-qty-label').innerText = `${selectedAppliance.quantity}`;

  // Limit slider max to current hours
  const slider = document.getElementById('sim-reduce-slider');
  const maxReducible = Math.max(0.5, Math.min(8.0, selectedAppliance.hours_per_day - 0.5));
  slider.max = maxReducible;
  if (parseFloat(slider.value) > maxReducible) {
    slider.value = Math.min(1.0, maxReducible);
  }

  // Pre-fill upgraded watts guess
  const nameLower = selectedAppliance.name.toLowerCase();
  let defaultNewWatts = selectedAppliance.power_watts;
  if (nameLower.includes('fan')) defaultNewWatts = 28;
  else if (nameLower.includes('bulb') || nameLower.includes('tube')) defaultNewWatts = 9;
  else if (nameLower.includes('ac')) defaultNewWatts = Math.round(selectedAppliance.power_watts * 0.65);

  document.getElementById('sim-new-watts').value = defaultNewWatts;

  onSliderChange();
  runSimulation();
}

function onSliderChange() {
  const val = parseFloat(document.getElementById('sim-reduce-slider').value) || 1.0;
  document.getElementById('slider-reduce-label').innerText = `${val.toFixed(1)} hour${val > 1 ? 's' : ''} / day`;
  runSimulation();
}

function onUpgradeToggle() {
  const checked = document.getElementById('sim-upgrade-check').checked;
  document.getElementById('sim-upgrade-fields').style.display = checked ? 'block' : 'none';
  runSimulation();
}

async function runSimulation() {
  if (!selectedAppliance) return;

  const hourReduction = parseFloat(document.getElementById('sim-reduce-slider').value) || 0;
  const isUpgrade = document.getElementById('sim-upgrade-check').checked;
  const newWatts = isUpgrade
    ? (parseFloat(document.getElementById('sim-new-watts').value) || selectedAppliance.power_watts)
    : selectedAppliance.power_watts;

  const payload = {
    appliance_id: selectedAppliance.id,
    hour_reduction: hourReduction,
    new_watts: newWatts
  };

  try {
    const res = await fetch('/api/simulate-savings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Simulation failed');
    const result = await res.json();
    renderSimulationResult(result);
  } catch (err) {
    console.error(err);
  }
}

function renderSimulationResult(r) {
  document.getElementById('result-saved-cost-month').innerText = formatCurrency(r.saved_cost_month);
  document.getElementById('result-saved-kwh-month').innerText = `${r.saved_kwh_month} kWh reduced / month`;
  document.getElementById('result-saved-cost-year').innerText = formatCurrency(r.saved_cost_year);

  // Comparison table
  document.getElementById('comp-old-watts').innerText = `${r.original_watts} W`;
  document.getElementById('comp-new-watts').innerText = `${r.simulated_watts} W`;
  const diffWatts = r.original_watts - r.simulated_watts;
  document.getElementById('comp-diff-watts').innerText = diffWatts > 0 ? `-${diffWatts} W` : '0 W';

  document.getElementById('comp-old-hours').innerText = `${r.original_hours} hrs`;
  document.getElementById('comp-new-hours').innerText = `${r.simulated_hours} hrs`;
  const diffHours = r.original_hours - r.simulated_hours;
  document.getElementById('comp-diff-hours').innerText = diffHours > 0 ? `-${diffHours} hrs` : '0 hrs';

  document.getElementById('comp-old-kwh').innerText = `${r.original_kwh} kWh`;
  document.getElementById('comp-new-kwh').innerText = `${r.simulated_kwh} kWh`;
  document.getElementById('comp-diff-kwh').innerText = `-${r.saved_kwh_month} kWh`;

  document.getElementById('co2-cut-label').innerText = `${r.co2_saved_year} kg CO₂ / year`;
}

function renderSmartTips(tips) {
  const container = document.getElementById('tips-container');
  if (!container) return;

  if (tips.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted); padding: 1.5rem;">No specific tips generated. Add more appliances to receive customized energy advice.</div>';
    return;
  }

  let html = '';
  tips.forEach(t => {
    html += `
      <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
            <span class="badge badge-category">${t.category}</span>
            <span class="badge badge-rank-normal" style="font-size: 0.7rem;">${t.difficulty}</span>
          </div>
          <h4 style="font-size: 0.95rem; margin-bottom: 0.4rem; color: #fff;">${t.title}</h4>
          <p style="font-size: 0.82rem; color: var(--text-muted); line-height: 1.45; margin-bottom: 1rem;">
            ${t.action}
          </p>
        </div>
        <div style="border-top: 1px solid var(--border-color); padding-top: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 0.75rem; color: var(--text-dim);">Est. Annual Savings:</div>
            <strong style="color: var(--accent-emerald-light); font-size: 1rem;">${formatCurrency(t.saved_cost_year)}</strong>
          </div>
          <span style="font-size: 0.75rem; color: var(--accent-cyan);">${t.saved_kwh_month} kWh/mo</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}
