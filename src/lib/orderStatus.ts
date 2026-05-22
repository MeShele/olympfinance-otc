/**
 * Single source-of-truth for `orders.status` → user-visible label + color intent.
 *
 * Every component that renders an order status — client /orders page,
 * admin OrdersTable, OrdersKanban — imports from here.
 *
 * Стадии (для группировки в Kanban):
 *   - waiting       — ждём клиента (он ещё не подтвердил оплату)
 *   - action_needed — мяч у админа: клиент сказал что оплатил, нужно выдать
 *   - done          — закрыт успешно
 *   - failed        — отменён, истёк, или редкий paid (legacy)
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
  pending: 'Ожидает оплаты',
  paid: 'Оплачено (legacy)',
  // processing в OTC = клиент нажал "Я оплатил", мяч у админа
  processing: 'Ожидает выдачи',
  completed: 'Завершён',
  cancelled: 'Отменён',
  expired: 'Истёк',
}

export type OrderStatusColor = 'amber' | 'emerald' | 'blue' | 'red' | 'gray' | 'orange'

export const ORDER_STATUS_COLOR: Record<OrderStatus, OrderStatusColor> = {
  awaiting_payment: 'amber',
  pending: 'amber',
  paid: 'gray',
  processing: 'orange',
  completed: 'emerald',
  cancelled: 'red',
  expired: 'red',
}

export type OrderStage = 'waiting' | 'action_needed' | 'done' | 'failed'

export const ORDER_STATUS_STAGE: Record<OrderStatus, OrderStage> = {
  awaiting_payment: 'waiting',
  pending: 'waiting',
  processing: 'action_needed',
  completed: 'done',
  paid: 'failed',
  cancelled: 'failed',
  expired: 'failed',
}

export function getOrderStatusLabel(status: string): string {
  return (ORDER_STATUS_LABELS as Record<string, string>)[status] ?? status
}

export function getOrderStatusColor(status: string): OrderStatusColor {
  return (ORDER_STATUS_COLOR as Record<string, OrderStatusColor>)[status] ?? 'gray'
}

export function getOrderStage(status: string): OrderStage {
  return (ORDER_STATUS_STAGE as Record<string, OrderStage>)[status] ?? 'failed'
}
