let allAppliances = [];
let currentCategoryFilter = 'All';

document.addEventListener('DOMContentLoaded', () => {
  loadAppliances();
  updateDemoCalc();

  // If URL has #add hash, automatically open modal
  if (window.location.hash === '#add') {
    openAddModal();
  }
});

// Interactive Showcase Calculator (Section 4 in project spec)
function updateDemoCalc() {
  const watts = parseFloat(document.getElementById('demo-watts').value) || 0;
  const hours = parseFloat(document.getElementById('demo-hours').value) || 0;
  const qty = parseInt(document.getElementById('demo-qty').value) || 1;
  const days = parseInt(document.getElementById('demo-days').value) || 30;
  const rate = parseFloat(document.getElementById('demo-rate').value) || 7.0;

  document.getElementById('demo-watts-val').innerText = `${watts} W`;
  document.getElementById('demo-hours-val').innerText = `${hours} hours`;

  const monthlyKwh = (watts * hours * days * qty) / 1000.0;
  const dailyKwh = monthlyKwh / days;
  const monthlyCost = monthlyKwh * rate;

  document.getElementById('demo-kwh-result').innerText = `${monthlyKwh.toFixed(2)} kWh`;
  document.getElementById('demo-daily-result').innerText = `${dailyKwh.toFixed(2)} kWh daily`;
  document.getElementById('demo-cost-result').innerText = formatCurrency(monthlyCost);
}

function resetDemoCalculator() {
  document.getElementById('demo-watts').value = 75;
  document.getElementById('demo-hours').value = 8;
  document.getElementById('demo-qty').value = 2;
  document.getElementById('demo-days').value = 30;
  document.getElementById('demo-rate').value = 7.0;
  updateDemoCalc();
}

function addDemoAsCustomAppliance() {
  const watts = parseFloat(document.getElementById('demo-watts').value) || 75;
  const hours = parseFloat(document.getElementById('demo-hours').value) || 8;
  const qty = parseInt(document.getElementById('demo-qty').value) || 1;
  const days = parseInt(document.getElementById('demo-days').value) || 30;

  openAddModal();
  document.getElementById('app-name').value = `Sample Device (${watts}W)`;
  document.getElementById('app-watts').value = watts;
  document.getElementById('app-hours').value = hours;
  document.getElementById('app-qty').value = qty;
  document.getElementById('app-days').value = days;
}

// Fetch and Render Appliances
async function loadAppliances() {
  try {
    const res = await fetch('/api/appliances');
    if (!res.ok) throw new Error('Failed to load appliances');
    const data = await res.json();
    allAppliances = data.appliances || [];
    renderAppliancesTable();
  } catch (err) {
    console.error(err);
    showToast('Failed to load appliances', 'error');
  }
}

function filterCategory(category, btnElement) {
  currentCategoryFilter = category;
  const btns = document.querySelectorAll('#category-filter-buttons button');
  btns.forEach(b => {
    b.classList.remove('btn-outline-emerald');
    b.classList.add('btn-secondary');
  });
  if (btnElement) {
    btnElement.classList.remove('btn-secondary');
    btnElement.classList.add('btn-outline-emerald');
  }
  renderAppliancesTable();
}

function renderAppliancesTable() {
  const tbody = document.getElementById('appliances-list-body');
  if (!tbody) return;

  let filtered = allAppliances;
  if (currentCategoryFilter !== 'All') {
    filtered = allAppliances.filter(a => a.category.toLowerCase() === currentCategoryFilter.toLowerCase());
  }

  document.getElementById('appliances-count-summary').innerText = `Showing ${filtered.length} of ${allAppliances.length} appliances`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: var(--text-muted); padding: 2.5rem;">No appliances found in "${currentCategoryFilter}". Click "+ Custom Appliance" to add one.</td></tr>`;
    return;
  }

  let html = '';
  filtered.forEach(a => {
    let rankBadge = 'badge-rank-normal';
    if (a.rank === 1) rankBadge = 'badge-rank-1';
    else if (a.rank === 2) rankBadge = 'badge-rank-2';
    else if (a.rank === 3) rankBadge = 'badge-rank-3';

    const standbyText = a.standby_kwh > 0 
      ? `<span style="color: var(--accent-amber); font-size: 0.8rem;">${a.standby_kwh} kWh</span>`
      : `<span style="color: var(--text-dim);">-</span>`;

    html += `
      <tr>
        <td><span class="badge ${rankBadge}">#${a.rank}</span></td>
        <td>
          <strong>${a.name}</strong>
          ${a.percentage >= 25 ? '<span class="badge badge-warning" style="margin-left: 6px; font-size: 0.7rem;">High Load</span>' : ''}
        </td>
        <td><span class="badge badge-category">${a.category}</span></td>
        <td>${a.power_watts} W</td>
        <td>${a.quantity}</td>
        <td>${a.hours_per_day} h</td>
        <td>${standbyText}</td>
        <td><strong>${a.total_kwh}</strong> <span style="font-size: 0.75rem; color: var(--text-dim);">kWh</span></td>
        <td>
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="width: 44px; background: rgba(255,255,255,0.08); height: 6px; border-radius: 3px; overflow: hidden;">
              <div style="width: ${Math.min(100, a.percentage)}%; background: #10b981; height: 100%;"></div>
            </div>
            <span>${a.percentage}%</span>
          </div>
        </td>
        <td><strong style="color: var(--accent-emerald-light);">${formatCurrency(a.estimated_cost)}</strong></td>
        <td>
          <div style="display: flex; gap: 0.35rem;">
            <button class="btn btn-secondary btn-sm" onclick="openEditModal(${a.id})" title="Edit Appliance">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="deleteAppliance(${a.id}, '${a.name}')" title="Delete Appliance">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

// Modal Handlers
function openAddModal() {
  document.getElementById('modalTitle').innerText = '+ Add New Appliance';
  document.getElementById('edit-id').value = '';
  document.getElementById('applianceForm').reset();
  document.getElementById('app-qty').value = 1;
  document.getElementById('app-hours').value = 6;
  document.getElementById('app-days').value = 30;
  document.getElementById('app-standby-watts').value = 0;
  document.getElementById('app-standby-hours').value = 0;
  document.getElementById('applianceModal').classList.add('open');
}

function openEditModal(appId) {
  const app = allAppliances.find(a => a.id === appId);
  if (!app) return;

  document.getElementById('modalTitle').innerText = `✏️ Edit: ${app.name}`;
  document.getElementById('edit-id').value = app.id;
  document.getElementById('app-name').value = app.name;
  document.getElementById('app-category').value = app.category;
  document.getElementById('app-watts').value = app.power_watts;
  document.getElementById('app-qty').value = app.quantity;
  document.getElementById('app-hours').value = app.hours_per_day;
  document.getElementById('app-days').value = app.days_per_month;
  document.getElementById('app-standby-watts').value = app.standby_watts || 0;
  document.getElementById('app-standby-hours').value = app.standby_hours || 0;

  document.getElementById('applianceModal').classList.add('open');
}

function closeApplianceModal() {
  document.getElementById('applianceModal').classList.remove('open');
}

function openPresetModal() {
  document.getElementById('presetModal').classList.add('open');
}

function closePresetModal() {
  document.getElementById('presetModal').classList.remove('open');
}

function usePreset(preset) {
  closePresetModal();
  openAddModal();
  document.getElementById('app-name').value = preset.name;
  document.getElementById('app-category').value = preset.category;
  document.getElementById('app-watts').value = preset.watts;
  document.getElementById('app-hours').value = preset.hours;
  document.getElementById('app-qty').value = 1;
  document.getElementById('app-days').value = 30;
  document.getElementById('app-standby-watts').value = preset.standby_watts || 0;
  document.getElementById('app-standby-hours').value = preset.standby_hours || 0;
  showToast(`Loaded preset: ${preset.name}`, 'info');
}

// Form Submission
async function handleApplianceSubmit(e) {
  e.preventDefault();
  const editId = document.getElementById('edit-id').value;

  const payload = {
    name: document.getElementById('app-name').value.trim(),
    category: document.getElementById('app-category').value,
    power_watts: parseFloat(document.getElementById('app-watts').value),
    quantity: parseInt(document.getElementById('app-qty').value),
    hours_per_day: parseFloat(document.getElementById('app-hours').value),
    days_per_month: parseInt(document.getElementById('app-days').value),
    standby_watts: parseFloat(document.getElementById('app-standby-watts').value) || 0,
    standby_hours: parseFloat(document.getElementById('app-standby-hours').value) || 0
  };

  try {
    let res;
    if (editId) {
      res = await fetch(`/api/appliances/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch('/api/appliances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Operation failed');

    closeApplianceModal();
    showToast(data.message);
    loadAppliances();
  } catch (err) {
    console.error(err);
    showToast(err.message, 'error');
  }
}

async function deleteAppliance(appId, appName) {
  if (!confirm(`Are you sure you want to remove "${appName}"?`)) return;

  try {
    const res = await fetch(`/api/appliances/${appId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to delete');

    showToast(data.message);
    loadAppliances();
  } catch (err) {
    console.error(err);
    showToast(err.message, 'error');
  }
}
