/*
 * SmileHub status vocabulary — single source of truth for all UI / backend / chatbot / timeline.
 * Every status string lives in ONE place. New statuses require migration notes.
 */
export const STATUSES = {
  // Core enum — keep alphabetical for easy grep.
  pending: 'Pending',
  pending_payment: 'Pending Payment',
  pending_quotation: 'Pending Quotation',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
  refunded: 'Refunded',

  // Derived / UI-only flag.
  get active() {
    return [
      'pending',
      'pending_payment',
      'pending_quotation',
      'processing'
    ]
  }
}

/**
 * Human-readable label map (kept in sync with the enum keys above).
 * Order matters: this mirrors STATUSES keys exactly.
 */
export const STATUS_LABELS = {
  pending: 'Pending',
  pending_payment: 'Pending Payment',
  pending_quotation: 'Pending Quotation',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
  refunded: 'Refunded'
}

/**
 * Fast membership test — returns the canonical key or null.
 */
export function resolveStatus(key) {
  if (key === undefined || key === null) return null
  const k = String(key).trim().toLowerCase().replace(/\s+/g, '_')
  if (Object.prototype.hasOwnProperty.call(STATUSES, k)) return k
  // Fuzzy fallbacks for historical / DB strings that may have slightly different casing / spacing
  const fallback = {
    pending: 'pending',
    'pending payment': 'pending_payment',
    'pending quotation': 'pending_quotation',
    processing: 'processing',
    shipped: 'shipped',
    delivered: 'delivered',
    cancelled: 'cancelled',
    returned: 'returned',
    refunded: 'refunded'
  }
  return fallback[k] || null
}

/**
 * Returns true if the status is one the customer can see as “active” (not final/terminal).
 */
export function isActiveStatus(status) {
  return STATUSES.active.includes(resolveStatus(status))
}

/**
 * Returns the color class used by the status-icon system in admin.js.
 */
export function statusColorClass(status) {
  const map = {
    pending: '#f0a320',
    pending_payment: '#f0a320',
    pending_quotation: '#f0a320',
    processing: '#1261a0',
    shipped: '#0f9d9a',
    delivered: '#1e9b61',
    cancelled: '#d64545',
    returned: '#D97706',
    refunded: '#7C3AED'
  }
  return map[resolveStatus(status)] || '#6b7280'
}