/**
 * UI Module - Common UI Operations
 * Student Attendance Management System
 */

// Toast notification system
class ToastManager {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    // Create toast container
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  }

  show(message, type = 'info', title = '', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconMap = {
      success: 'check-circle',
      error: 'times-circle',
      warning: 'exclamation-triangle',
      info: 'info-circle'
    };

    const icon = iconMap[type] || 'info-circle';
    
    toast.innerHTML = `
      <i class="fas fa-${icon} toast-icon"></i>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    `;

    this.container.appendChild(toast);

    // Auto remove
    if (duration > 0) {
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }

    return toast;
  }
}

// Modal system
class ModalManager {
  constructor() {
    this.activeModal = null;
  }

  create(options = {}) {
    const {
      title = '',
      content = '',
      size = 'md', // sm, md, lg
      showClose = true,
      footer = '',
      onClose = null
    } = options;

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = `modal modal-${size}`;
    
    let headerHtml = '';
    if (title || showClose) {
      headerHtml = `
        <div class="modal-header">
          ${title ? `<h3 class="modal-title">${title}</h3>` : '<div></div>'}
          ${showClose ? `<button class="modal-close" onclick="modalManager.close()">&times;</button>` : ''}
        </div>
      `;
    }

    let footerHtml = '';
    if (footer) {
      footerHtml = `<div class="modal-footer">${footer}</div>`;
    }

    modal.innerHTML = `
      ${headerHtml}
      <div class="modal-body">${content}</div>
      ${footerHtml}
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Store reference
    this.activeModal = overlay;
    this.onCloseCallback = onClose;

    // Show modal
    requestAnimationFrame(() => {
      overlay.classList.add('active');
    });

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.close();
      }
    });

    // Close on escape key
    document.addEventListener('keydown', this.handleEscape);

    return overlay;
  }

  handleEscape = (e) => {
    if (e.key === 'Escape') {
      this.close();
    }
  }

  close() {
    if (this.activeModal) {
      this.activeModal.classList.remove('active');
      setTimeout(() => {
        this.activeModal.remove();
        this.activeModal = null;
      }, 200);
      
      document.removeEventListener('keydown', this.handleEscape);
      
      if (this.onCloseCallback) {
        this.onCloseCallback();
      }
    }
  }

  // Quick confirm dialog
  confirm(message, title = 'Confirm', onConfirm = null, onCancel = null) {
    const footer = `
      <button class="btn btn-secondary" onclick="modalManager.close(); ${onCancel ? onCancel.name + '()' : ''}">Cancel</button>
      <button class="btn btn-danger" onclick="modalManager.close(); ${onConfirm ? onConfirm.name + '()' : ''}">Confirm</button>
    `;

    this.create({
      title: title,
      content: `<p>${message}</p>`,
      footer: footer,
      onClose: onCancel
    });
  }
}

// Loading spinner
class LoadingManager {
  constructor() {
    this.spinner = null;
  }

  show(message = 'Loading...') {
    if (this.spinner) {
      this.hide();
    }

    this.spinner = document.createElement('div');
    this.spinner.className = 'spinner-overlay';
    this.spinner.innerHTML = `
      <div style="text-align: center;">
        <div class="spinner" style="margin-bottom: 1rem;"></div>
        <p style="color: var(--gray-600);">${message}</p>
      </div>
    `;

    document.body.appendChild(this.spinner);
  }

  hide() {
    if (this.spinner) {
      this.spinner.remove();
      this.spinner = null;
    }
  }
}

// Initialize global UI managers
const toastManager = new ToastManager();
const modalManager = new ModalManager();
const loadingManager = new LoadingManager();

// Helper functions
function showToast(message, type = 'info', title = '', duration = 3000) {
  return toastManager.show(message, type, title, duration);
}

function showLoading(message = 'Loading...') {
  loadingManager.show(message);
}

function hideLoading() {
  loadingManager.hide();
}

function showModal(options) {
  return modalManager.create(options);
}

function closeModal() {
  modalManager.close();
}

function confirmDialog(message, onConfirm, onCancel = null) {
  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-danger" id="confirm-btn">Confirm</button>
  `;

  const modal = showModal({
    title: 'Confirm',
    content: `<p>${message}</p>`,
    footer: footer
  });

  document.getElementById('confirm-btn').addEventListener('click', () => {
    closeModal();
    if (onConfirm) onConfirm();
  });
}

// Format date
function formatDate(dateString, format = 'short') {
  const date = new Date(dateString);
  
  if (format === 'short') {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } else if (format === 'long') {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  } else if (format === 'iso') {
    return date.toISOString().split('T')[0];
  }
  
  return dateString;
}

// Format time
function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Get relative time
function getRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else {
    return formatDate(dateString);
  }
}

// Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle function
function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Generate unique ID
function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Export to CSV
function exportToCSV(data, filename) {
  if (!data || data.length === 0) {
    showToast('No data to export', 'warning');
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape values with commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  // Download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);

  showToast('File downloaded successfully', 'success');
}

// Download JSON
function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

// Read file as JSON
function readFileAsJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        resolve(data);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

// Update sync status indicator
async function updateSyncStatus() {
  const statusEl = document.getElementById('sync-status');
  if (!statusEl) return;

  const isOnline = navigator.onLine;
  const pendingCount = await db.getPendingSyncCount();

  if (!isOnline) {
    statusEl.className = 'sync-status offline';
    statusEl.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline';
  } else if (pendingCount > 0) {
    statusEl.className = 'sync-status pending';
    statusEl.innerHTML = `<i class="fas fa-sync-alt fa-spin"></i> ${pendingCount} pending`;
  } else {
    statusEl.className = 'sync-status synced';
    statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Synced';
  }
}

// Initialize tooltips and other UI elements
document.addEventListener('DOMContentLoaded', () => {
  // Update sync status on load
  updateSyncStatus();
  
  // Update sync status periodically
  setInterval(updateSyncStatus, 30000);
});
