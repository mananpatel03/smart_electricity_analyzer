// Global Utilities for Smart Electricity Bill & Energy Waste Analyzer

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  if (type === 'error') {
    toast.style.borderLeftColor = '#f43f5e';
    toast.innerHTML = `<span>⚠️</span> <span>${message}</span>`;
  } else if (type === 'info') {
    toast.style.borderLeftColor = '#06b6d4';
    toast.innerHTML = `<span>ℹ️</span> <span>${message}</span>`;
  } else {
    toast.style.borderLeftColor = '#10b981';
    toast.innerHTML = `<span>✅</span> <span>${message}</span>`;
  }

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function formatCurrency(num) {
  return '₹' + Number(num || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatUnits(num) {
  return Number(num || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2
  }) + ' kWh';
}
