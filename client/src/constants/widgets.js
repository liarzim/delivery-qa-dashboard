/**
 * Shared widget catalogue — used by MainDashboard, SubDashboardPage, and WidgetBank.
 * Each entry carries both EN and HE labels so the bank can display the correct locale.
 */

export const ALL_WIDGETS = [
  { id: 'committed-rate',   label: 'Committed Rate',     label_he: 'אחוז מחויבות',       category: 'Delivery', category_he: 'משלוח' },
  { id: 'uncommitted-rate', label: 'Uncommitted Rate',   label_he: 'אחוז לא מחויב',      category: 'Delivery', category_he: 'משלוח' },
  { id: 'overall-rate',     label: 'Overall Rate',       label_he: 'אחוז כולל',           category: 'Delivery', category_he: 'משלוח' },
  { id: 'avg-velocity',     label: 'Avg Velocity',       label_he: 'מהירות ממוצעת',      category: 'Delivery', category_he: 'משלוח' },
  { id: 'throughput',       label: 'Throughput',         label_he: 'תפוקה',               category: 'Delivery', category_he: 'משלוח' },
  { id: 'committed-gauge',  label: 'Committed Gauge',    label_he: 'מד מחויבות',         category: 'Delivery', category_he: 'משלוח' },
  { id: 'reopen-pct',       label: 'Reopen %',           label_he: '% פתיחה מחדש',       category: 'QA',       category_he: 'בדיקות' },
  { id: 'rejected-pct',     label: 'Rejected %',         label_he: '% דחייה',            category: 'QA',       category_he: 'בדיקות' },
  { id: 'escaping-pct',     label: 'Escaping %',         label_he: '% בריחה',            category: 'QA',       category_he: 'בדיקות' },
  { id: 'reopen-density',   label: 'Reopen Density',     label_he: 'צפיפות פתיחה מחדש', category: 'QA',       category_he: 'בדיקות' },
  { id: 'escaping-density', label: 'Escaping Density',   label_he: 'צפיפות בריחה',       category: 'QA',       category_he: 'בדיקות' },
];

export const DEFAULT_LAYOUT = [
  'committed-rate', 'overall-rate', 'avg-velocity',
  'reopen-pct', 'rejected-pct', 'escaping-pct',
];
