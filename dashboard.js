document.addEventListener('DOMContentLoaded', () => {
  loadDashboardData();
});

let shareChart = null;
let categoryChart = null;
let historyChart = null;

async function loadDashboardData() {
  try {
    const res = await fetch('/api/dashboard-data');
    if (!res.ok) throw new Error('Failed to load dashboard data');
    const data = await res.json();

    updateKPIs(data);
    renderAlerts(data);
    renderCharts(data);
    renderApplianceTable(data);
  } catch (err) {
    console.error(err);
    showToast('Error loading dashboard: ' + err.message, 'error');
  }
}

function updateKPIs(data) {
  document.getElementById('stat-total-kwh').innerText = formatUnits(data.total_kwh);
  document.getElementById('stat-daily-kwh').innerText = `Avg ${data.daily_kwh} kWh / day`;

  const bill = data.bill || {};
  document.getElementById('stat-total-bill').innerText = formatCurrency(bill.total_amount);
  document.getElementById('stat-effective-rate').innerText = `Effective: ₹${bill.effective_rate || 7} / unit`;

  const top = data.top_consumer;
  if (top) {
    document.getElementById('stat-top-name').innerText = top.name;
    document.getElementById('stat-top-meta').innerText = `${top.percentage}% of total energy (₹${top.estimated_cost}/mo)`;
  } else {
    document.getElementById('stat-top-name').innerText = 'None added';
    document.getElementById('stat-top-meta').innerText = 'Add appliances to rank';
  }

  document.getElementById('stat-co2').innerText = `${data.co2_total_kg} kg CO₂`;
  document.getElementById('stat-trees').innerText = `Needs ~${data.trees_needed_annual} trees/yr to offset`;
}

function renderAlerts(data) {
  const container = document.getElementById('alerts-container');
  if (!container) return;

  const alerts = data.waste_alerts || [];
  if (alerts.length === 0) {
    container.innerHTML = '';
    return;
  }

  let html = '';
  alerts.forEach(a => {
    const icon = a.type === 'warning' ? '⚠️' : '⚡';
    const cls = a.type === 'warning' ? 'alert-warning' : 'alert-info';
    html += `
      <div class="alert-box ${cls}">
        <span style="font-size: 1.3rem;">${icon}</span>
        <div style="flex: 1;">
          <strong>${a.title}</strong>
          <div style="font-size: 0.85rem; margin-top: 2px;">${a.message}</div>
        </div>
        <a href="/savings-simulator?appliance=${a.appliance_id}" class="btn btn-secondary btn-sm" style="white-space: nowrap;">
          Simulate Savings →
        </a>
      </div>
    `;
  });
  container.innerHTML = html;
}

function renderCharts(data) {
  const apps = data.appliances || [];
  const categories = data.category_summary || [];
  const history = data.history || [];

  // Chart 1: Donut Share
  const ctxShare = document.getElementById('applianceShareChart');
  if (ctxShare) {
    if (shareChart) shareChart.destroy();

    const labels = apps.map(a => a.name);
    const shares = apps.map(a => a.total_kwh);
    const colors = [
      '#10b981', '#06b6d4', '#f59e0b', '#ec4899', '#8b5cf6',
      '#3b82f6', '#f43f5e', '#14b8a6', '#64748b', '#a855f7'
    ];

    shareChart = new Chart(ctxShare, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: shares,
          backgroundColor: colors.slice(0, apps.length),
          borderColor: '#162540',
          borderWidth: 2,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 12,
              color: '#94a3b8',
              font: { size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const val = ctx.raw;
                const pct = ((val / data.total_kwh) * 100).toFixed(1);
                return ` ${ctx.label}: ${val} kWh (${pct}%)`;
              }
            }
          }
        },
        cutout: '65%'
      }
    });
  }

  // Chart 2: Category Breakdown
  const ctxCat = document.getElementById('categoryChart');
  if (ctxCat) {
    if (categoryChart) categoryChart.destroy();

    const catLabels = categories.map(c => c.category);
    const catKwh = categories.map(c => c.kwh);

    categoryChart = new Chart(ctxCat, {
      type: 'bar',
      data: {
        labels: catLabels,
        datasets: [{
          label: 'Consumption (kWh)',
          data: catKwh,
          backgroundColor: 'rgba(16, 185, 129, 0.75)',
          borderColor: '#10b981',
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            ticks: { color: '#94a3b8' },
            grid: { display: false }
          },
          y: {
            ticks: { color: '#94a3b8' },
            grid: { color: 'rgba(255, 255, 255, 0.05)' }
          }
        }
      }
    });
  }

  // Chart 3: Historical Trend
  const ctxHist = document.getElementById('historyChart');
  if (ctxHist) {
    if (historyChart) historyChart.destroy();

    const histLabels = history.map(h => h.billing_period);
    const histUnits = history.map(h => h.units_consumed);
    const histActual = history.map(h => h.actual_amount || h.estimated_amount);

    historyChart = new Chart(ctxHist, {
      type: 'bar',
      data: {
        labels: histLabels,
        datasets: [
          {
            type: 'bar',
            label: 'Monthly Units (kWh)',
            data: histUnits,
            backgroundColor: 'rgba(6, 182, 212, 0.65)',
            borderColor: '#06b6d4',
            borderWidth: 1,
            borderRadius: 6,
            yAxisID: 'y'
          },
          {
            type: 'line',
            label: 'Bill Amount (₹)',
            data: histActual,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            borderWidth: 3,
            pointBackgroundColor: '#10b981',
            pointRadius: 4,
            tension: 0.3,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: { color: '#94a3b8' },
            grid: { display: false }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: { display: true, text: 'Units (kWh)', color: '#06b6d4' },
            ticks: { color: '#94a3b8' },
            grid: { color: 'rgba(255, 255, 255, 0.05)' }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: { display: true, text: 'Bill Amount (₹)', color: '#10b981' },
            ticks: { color: '#94a3b8' },
            grid: { drawOnChartArea: false }
          }
        },
        plugins: {
          legend: {
            labels: { color: '#94a3b8' }
          }
        }
      }
    });
  }
}

function renderApplianceTable(data) {
  const tbody = document.getElementById('appliance-table-body');
  if (!tbody) return;

  const apps = data.appliances || [];
  if (apps.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 2rem;">No appliances registered yet. Click "+ Add Appliance" to get started!</td></tr>`;
    return;
  }

  let html = '';
  apps.forEach(a => {
    let rankBadge = 'badge-rank-normal';
    if (a.rank === 1) rankBadge = 'badge-rank-1';
    else if (a.rank === 2) rankBadge = 'badge-rank-2';
    else if (a.rank === 3) rankBadge = 'badge-rank-3';

    html += `
      <tr>
        <td><span class="badge ${rankBadge}">#${a.rank}</span></td>
        <td><strong>${a.name}</strong></td>
        <td><span class="badge badge-category">${a.category}</span></td>
        <td>${a.power_watts} W</td>
        <td>${a.quantity}</td>
        <td>${a.hours_per_day} h</td>
        <td><strong>${a.total_kwh}</strong> <span style="font-size: 0.75rem; color: var(--text-dim);">kWh</span></td>
        <td>
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="width: 48px; background: rgba(255,255,255,0.08); height: 6px; border-radius: 3px; overflow: hidden;">
              <div style="width: ${Math.min(100, a.percentage)}%; background: #10b981; height: 100%;"></div>
            </div>
            <span>${a.percentage}%</span>
          </div>
        </td>
        <td><strong style="color: var(--accent-emerald-light);">${formatCurrency(a.estimated_cost)}</strong></td>
        <td>
          <a href="/savings-simulator?appliance=${a.id}" class="btn btn-secondary btn-sm" title="Simulate savings for this appliance">
            💡 Simulate
          </a>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}
