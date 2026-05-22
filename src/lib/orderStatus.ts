/**
 * Single source-of-truth for `orders.status` → user-visible label + color intent.
 *
 * Every component that renders an order status — client /orders page,
 * admin OrdersTable, future superadmin views — imports from here instead
 * of maintaining its own mapping. Two parallel maps drifted in the past
 * (missing `paid` on both sides) and rendered paid orders as "Ожидает
 * оплаты". Consolidating here is the owner-layer fix.
 *
 * Concrete icons / Tailwind classes stay local to each renderer — colors
 * and labels are authoritative here, visual chrome is a per-surface call.
 */

export const ORDER_STATUSES = [
  'awaiting_payment',
  'pending',
  'paid',
  'processing',
  'completed',
  'cancelled',
  'expired',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_payment: 'Ожидает оплаты',
  pending: 'Ожидает обработки',
  paid: 'Оплачено',
  processing: 'В обработке',
  completed: 'Завершён',
  cancelled: 'Отменён',
  expired: 'Истёк',
}

export type OrderStatusColor = 'amber' | 'emerald' | 'blue' | 'red' | 'gray'

export const ORDER_STATUS_COLOR: Record<OrderStatus, OrderStatusColor> = {
  awaiting_payment: 'amber',
  pending: 'amber',
  paid: 'emerald',
  processing: 'blue',
  completed: 'emerald',
  cancelled: 'red',
  expired: 'red',
}

export function getOrderStatusLabel(status: string): string {
  return (ORDER_STATUS_LABELS as Record<string, string>)[status] ?? status
}

export function getOrderStatusColor(status: string): OrderStatusColor {
  return (ORDER_STATUS_COLOR as Record<string, OrderStatusColor>)[status] ?? 'gray'
}
