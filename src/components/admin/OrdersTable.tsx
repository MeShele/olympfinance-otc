import { useState } from "react";
import { Trash2, Check, X, ArrowRight, Download, FileText, Loader2, AlertTriangle, Timer, CheckCircle2, Hourglass, MoreVertical } from "lucide-react";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  getOrderStatusColor,
  type OrderStatus,
  type OrderStatusColor,
} from "@/lib/orderStatus";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Order, useUpdateOrderStatus, useDeleteOrder } from "@/hooks/useOrders";
import PayoutConfirmDialog from "@/components/admin/PayoutConfirmDialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { generateOrderNumber } from "@/utils/orderDocument";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { buildCompanyData } from "@/utils/pdf/companyData";
import type { CompanyData } from "@/utils/pdf/types";
import { supabase } from "@/integrations/supabase/client";
import { useOperatorId } from "@/hooks/useOperatorId";
import { downloadOrderPDF } from "@/utils/orderPdfDownload";
import {
  parseBankInfo,
  parsePaymentInfo,
  parseBuyPaymentInfo,
  type BankInfo,
  type PaymentInfo,
} from "@/utils/orderNotes";

interface OrdersTableProps {
  orders: Order[];
}


// Extract user comment from notes (works for all order types)
const parseUserNotes = (notes: string | null): string | null => {
  if (!notes) return null;
  try {
    const parsed = JSON.parse(notes);
    return parsed.user_notes || null;
  } catch {
    // Plain text notes (BUY orders) — return as-is
    return notes.trim() || null;
  }
};

// Status visual config — labels & colors come from the shared module
// (src/lib/orderStatus.ts). Icons remain local because they carry table-
// specific styling intent. Adding a new status: put it in ORDER_STATUSES
// in orderStatus.ts — the dropdown and cell rendering pick it up
// automatically via the map derivation below.
const STATUS_BG_BY_COLOR: Record<OrderStatusColor, string> = {
  amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  orange: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  red: "bg-red-500/10 text-red-400 border-red-500/20",
  gray: "bg-secondary/40 text-muted-foreground border-border/20",
};
const STATUS_ICON_BY_STATUS: Record<OrderStatus, React.ReactNode> = {
  awaiting_payment: <Timer className="w-3 h-3" />,
  pending: <Timer className="w-3 h-3" />,
  paid: <AlertTriangle className="w-3 h-3" />,
  processing: <Hourglass className="w-3 h-3" />,
  completed: <Check className="w-3 h-3" />,
  cancelled: <X className="w-3 h-3" />,
  expired: <AlertTriangle className="w-3 h-3" />,
};
const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> =
  Object.fromEntries(
    ORDER_STATUSES.map((s) => [
      s,
      {
        label: ORDER_STATUS_LABELS[s],
        className: STATUS_BG_BY_COLOR[getOrderStatusColor(s)],
        icon: STATUS_ICON_BY_STATUS[s],
      },
    ]),
  );

// Check if payment is expired
const isPaymentExpired = (expiresAt: string | undefined): boolean => {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
};

// Check if order is a sell order (crypto to fiat)
const isSellOrder = (order: Order): boolean => {
  const cryptoCurrencies = ['BTC', 'ETH', 'USDT', 'USDC', 'TON', 'SOL'];
  const fiatCurrencies = ['USD', 'EUR', 'RUB', 'KZT', 'KGS'];
  return cryptoCurrencies.includes(order.from_currency) && fiatCurrencies.includes(order.to_currency);
};

// Check if order is a buy order (fiat to crypto)
const isBuyOrder = (order: Order): boolean => {
  const cryptoCurrencies = ['BTC', 'ETH', 'USDT', 'USDC', 'TON', 'SOL'];
  const fiatCurrencies = ['USD', 'EUR', 'RUB', 'KZT', 'KGS'];
  return fiatCurrencies.includes(order.from_currency) && cryptoCurrencies.includes(order.to_currency);
};

const DEFAULT_COMPANY: CompanyData = {
  companyName: "Оператор",
  inn: "",
  okpo: "",
  legalAddress: "",
  website: "",
  directorShort: "",
  feePercent: 0,
  logoUrl: null,
  phone: null,
  email: null,
  directorName: null,
};

const OrdersTable = ({ orders }: OrdersTableProps) => {
  const updateStatus = useUpdateOrderStatus();
  const deleteOrder = useDeleteOrder();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [payoutOrder, setPayoutOrder] = useState<Order | null>(null);
  const [advancedOrder, setAdvancedOrder] = useState<Order | null>(null);
  const { data: companySettings } = useCompanySettings();
  const company = companySettings ? buildCompanyData(companySettings) : DEFAULT_COMPANY;
  const operatorId = useOperatorId();

  const formatNumber = (num: number) => {
    if (num < 0.0001) return num.toFixed(8);
    if (num < 1) return num.toFixed(4);
    return num.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      await updateStatus.mutateAsync({ id: orderId, status: newStatus });
      toast.success("Успешно", { description: "Статус заявки обновлён" });
    } catch (error: any) {
      toast.error("Ошибка", { description: error.message });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (order: Order) => {
    if (!confirm(`Удалить заявку #${order.id.slice(0, 8)}?`)) return;

    try {
      await deleteOrder.mutateAsync(order.id);
      toast.success("Успешно", { description: "Заявка удалена" });
    } catch (error: any) {
      toast.error("Ошибка", { description: error.message });
    }
  };

  const handleDownloadPDF = async (order: Order) => {
    setDownloadingId(order.id);
    try {
      await downloadOrderPDF(order, company, operatorId);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error("Ошибка", { description: "Не удалось сгенерировать PDF" });
    } finally {
      setDownloadingId(null);
    }
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-14 h-14 rounded-xl bg-muted border border-border flex items-center justify-center mx-auto mb-4">
          <FileText className="w-7 h-7 text-muted-foreground/60" />
        </div>
        <p className="text-muted-foreground font-medium">Заявок пока нет</p>
        <p className="text-sm text-muted-foreground/60 mt-1">Новые заявки появятся здесь автоматически</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-5 text-xs uppercase tracking-wider font-medium text-muted-foreground">ID</th>
            <th className="text-left py-3 px-5 text-xs uppercase tracking-wider font-medium text-muted-foreground">Дата</th>
            <th className="text-left py-3 px-5 text-xs uppercase tracking-wider font-medium text-muted-foreground">Клиент</th>
            <th className="text-left py-3 px-5 text-xs uppercase tracking-wider font-medium text-muted-foreground">Обмен</th>
            <th className="text-left py-3 px-5 text-xs uppercase tracking-wider font-medium text-muted-foreground">Сеть</th>
            <th className="text-right py-3 px-5 text-xs uppercase tracking-wider font-medium text-muted-foreground">Отдаёт</th>
            <th className="text-right py-3 px-5 text-xs uppercase tracking-wider font-medium text-muted-foreground">Получает</th>
            <th className="text-left py-3 px-5 text-xs uppercase tracking-wider font-medium text-muted-foreground">Контакт</th>
            <th className="text-center py-3 px-5 text-xs uppercase tracking-wider font-medium text-muted-foreground">Статус</th>
            <th className="text-right py-3 px-5 text-xs uppercase tracking-wider font-medium text-muted-foreground">Действия</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const paymentInfo = parsePaymentInfo(order.notes);
            const isSell = isSellOrder(order);
            const expired = paymentInfo ? isPaymentExpired(paymentInfo.expires_at) : false;
            
            // Determine actual display status
            let displayStatus = order.status;
            if (isSell && order.status === 'awaiting_payment' && expired) {
              displayStatus = 'expired';
            }
            const status = statusConfig[displayStatus] || statusConfig.awaiting_payment;
            
            return (
              <tr key={order.id} className="border-b border-border hover:bg-muted transition-colors">
                <td className="py-4 px-5 font-mono text-sm">
                  #{order.id.slice(0, 8)}
                </td>
                <td className="py-4 px-5 text-sm text-muted-foreground">
                  {format(new Date(order.created_at), "dd MMM, HH:mm", { locale: ru })}
                </td>
                <td className="py-4 px-5 text-sm max-w-[150px]">
                  {order.user_email ? (
                    <div>
                      <p className="font-medium truncate" title={order.user_email}>{order.user_email}</p>
                      {order.user_full_name && (
                        <p className="text-xs text-muted-foreground truncate">{order.user_full_name}</p>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="py-4 px-5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{order.from_currency}</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{order.to_currency}</span>
                    {isSell && (
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">Продажа</span>
                    )}
                    {isBuyOrder(order) && (
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Покупка</span>
                    )}
                  </div>
                </td>
                <td className="py-4 px-5 text-sm text-muted-foreground">
                  {order.network || '—'}
                </td>
                <td className="py-4 px-5 text-right font-mono">
                  {formatNumber(order.from_amount)} {order.from_currency}
                </td>
                <td className="py-4 px-5 text-right font-mono text-primary">
                  {formatNumber(order.to_amount)} {order.to_currency}
                </td>
                <td className="py-4 px-5 text-sm max-w-[150px]">
                  {/* For sell orders with active payment - show payment wallet */}
                  {isSell && paymentInfo?.wallet_address && !expired ? (
                    <div className="space-y-1">
                      <div className="truncate text-muted-foreground" title={paymentInfo.wallet_address}>
                        {paymentInfo.wallet_address.slice(0, 10)}...
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {paymentInfo.network}
                      </Badge>
                    </div>
                  ) : isSell && expired ? (
                    <span className="text-destructive text-xs flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Истёк
                    </span>
                  ) : (
                    <span className="truncate">{order.contact_info || order.wallet_address || "—"}</span>
                  )}
                </td>
                <td className="py-4 px-5">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border ${status.className}`}>
                    {status.icon}
                    {status.label}
                  </span>
                </td>
                <td className="py-4 px-5">
                  <div className="flex items-center justify-end gap-2">
                    {order.status === "processing" && (
                      <Button
                        size="sm"
                        onClick={() => setPayoutOrder(order)}
                        className="h-8 gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Подтвердить выплату
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedOrder(order)}
                      className="h-8 w-8 hover:text-primary"
                      title="Детали заявки"
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownloadPDF(order)}
                      disabled={downloadingId === order.id}
                      className="h-8 w-8 hover:text-blue-400"
                      title="Скачать PDF"
                    >
                      {downloadingId === order.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Ещё">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setAdvancedOrder(order)}
                          disabled={updatingId === order.id}
                        >
                          Изменить статус вручную
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(order)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Удалить заявку
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Payout confirmation */}
      <PayoutConfirmDialog order={payoutOrder} onClose={() => setPayoutOrder(null)} />

      {/* Advanced manual status change — escape hatch для крайних случаев */}
      <Dialog open={!!advancedOrder} onOpenChange={() => setAdvancedOrder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Изменить статус вручную
            </DialogTitle>
            <DialogDescription>
              Используй только если стандартный флоу сломался. Обычный путь — кнопка «Подтвердить выплату».
              Прямая смена статуса не пишет tx-hash в аудит.
            </DialogDescription>
          </DialogHeader>
          {advancedOrder && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Заявка <span className="font-mono">#{advancedOrder.id.slice(0, 8)}</span> · текущий статус:{" "}
                <strong>{statusConfig[advancedOrder.status]?.label ?? advancedOrder.status}</strong>
              </div>
              <Select
                value={advancedOrder.status}
                onValueChange={async (value) => {
                  await handleStatusChange(advancedOrder.id, value);
                  setAdvancedOrder(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Новый статус" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        {config.icon}
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdvancedOrder(null)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Детали заявки
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <OrderDetailsContent 
              order={selectedOrder} 
              formatNumber={formatNumber}
              downloadingId={downloadingId}
              onDownloadPDF={handleDownloadPDF}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Separate component for order details to avoid hooks rules issues
const OrderDetailsContent = ({
  order,
  formatNumber,
  downloadingId,
  onDownloadPDF
}: {
  order: Order;
  formatNumber: (n: number) => string;
  downloadingId: string | null;
  onDownloadPDF: (order: Order) => void;
}) => {
  const paymentInfo = parsePaymentInfo(order.notes);
  const bankInfo = parseBankInfo(order.notes);
  const buyPayment = parseBuyPaymentInfo(order.notes);
  const userNotes = parseUserNotes(order.notes);
  const isSell = isSellOrder(order);
  const isBuy = isBuyOrder(order);
  const expired = paymentInfo ? isPaymentExpired(paymentInfo.expires_at) : false;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Номер заявки</p>
          <p className="font-mono font-medium">
            {generateOrderNumber(order.id, order.created_at)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Дата создания</p>
          <p className="font-medium">
            {format(new Date(order.created_at), "dd.MM.yyyy HH:mm", { locale: ru })}
          </p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-secondary/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-muted-foreground">Отдаёт</span>
          <span className="font-mono font-semibold">
            {formatNumber(order.from_amount)} {order.from_currency}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Получает</span>
          <span className="font-mono font-semibold text-primary">
            {formatNumber(order.to_amount)} {order.to_currency}
          </span>
        </div>
      </div>

      {/* Payment info for sell orders */}
      {isSell && paymentInfo && (
        <div className="p-4 rounded-xl border border-border/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">Информация о платеже</span>
            {expired ? (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                Истёк
              </Badge>
            ) : (
              <Badge variant="default" className="gap-1">
                <Timer className="w-3 h-3" />
                Активен
              </Badge>
            )}
          </div>
          
          {!expired && paymentInfo.wallet_address && (
            <>
              <div>
                <p className="text-sm text-muted-foreground">Адрес для оплаты</p>
                <p className="font-mono text-xs break-all bg-secondary/50 p-2 rounded mt-1">
                  {paymentInfo.wallet_address}
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Сеть</p>
                  <p className="font-medium">{paymentInfo.network}</p>
                </div>
                {paymentInfo.expires_at && (
                  <div>
                    <p className="text-muted-foreground">Истекает</p>
                    <p className="font-medium">
                      {format(new Date(paymentInfo.expires_at), "HH:mm dd.MM", { locale: ru })}
                    </p>
                  </div>
                )}
              </div>
              {paymentInfo.payment_url && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => window.open(paymentInfo.payment_url, '_blank')}
                >
                  Открыть страницу оплаты
                </Button>
              )}
            </>
          )}
          
          {expired && (
            <p className="text-sm text-muted-foreground">
              Срок оплаты истёк. Клиенту необходимо создать новую заявку.
            </p>
          )}
        </div>
      )}

      {/* Payment info for buy orders — bank details where client pays */}
      {isBuy && buyPayment && (
        <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">Реквизиты для оплаты (клиент переводит сюда)</span>
            {buyPayment.expiresAt && isPaymentExpired(buyPayment.expiresAt) ? (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                Истёк
              </Badge>
            ) : (
              <Badge variant="default" className="gap-1">
                <Timer className="w-3 h-3" />
                Активен
              </Badge>
            )}
          </div>
          <div className="text-sm whitespace-pre-line bg-secondary/50 p-3 rounded-lg font-mono text-xs">
            {buyPayment.bankDetails}
          </div>
          {buyPayment.expiresAt && (
            <div className="text-sm">
              <span className="text-muted-foreground">Срок оплаты: </span>
              <span className="font-medium">
                {format(new Date(buyPayment.expiresAt), "HH:mm dd.MM.yyyy", { locale: ru })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Bank/sender info for sell/swap orders */}
      {bankInfo && (
        <div className="p-4 rounded-xl border border-border/50 space-y-2">
          {(isSell && (bankInfo.bank_name || bankInfo.recipient_name)) && (
            <>
              <p className="font-medium text-sm">Банковские реквизиты</p>
              {bankInfo.bank_name && (
                <div className="text-sm">
                  <p className="text-muted-foreground">Банк</p>
                  <p className="font-medium">{bankInfo.bank_name}</p>
                </div>
              )}
              <div className="text-sm">
                <p className="text-muted-foreground">Номер карты / счёта</p>
                <p className="font-mono text-xs break-all bg-secondary/50 p-2 rounded">
                  {order.wallet_address || "—"}
                </p>
              </div>
              {bankInfo.recipient_name && (
                <div className="text-sm">
                  <p className="text-muted-foreground">ФИО получателя</p>
                  <p className="font-medium">{bankInfo.recipient_name}</p>
                </div>
              )}
            </>
          )}
          {bankInfo.sender_wallet && (
            <div className="text-sm">
              <p className="text-muted-foreground">Кошелёк отправителя</p>
              <p className="font-mono text-xs break-all bg-secondary/50 p-2 rounded">
                {bankInfo.sender_wallet}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3 text-sm">
        {(order.user_email || order.user_full_name) && (
          <div>
            <p className="text-muted-foreground">Клиент</p>
            <p className="font-medium">{order.user_full_name || order.user_email}</p>
            {order.user_full_name && order.user_email && (
              <p className="text-xs text-muted-foreground">{order.user_email}</p>
            )}
          </div>
        )}
        <div>
          <p className="text-muted-foreground">
            {isBuy ? 'Крипто-кошелёк клиента (куда отправить)' : 'Реквизиты получения'}
          </p>
          <p className="font-mono text-xs break-all bg-secondary/50 p-2 rounded">
            {order.wallet_address || "—"}
          </p>
        </div>
        {order.network && (
          <div>
            <p className="text-muted-foreground">Сеть</p>
            <p className="font-medium">{order.network}</p>
          </div>
        )}
        <div>
          <p className="text-muted-foreground">Контакт</p>
          <p className="font-medium">{order.contact_info || "—"}</p>
        </div>
        {userNotes && (
          <div>
            <p className="text-muted-foreground">Комментарий клиента</p>
            <p className="font-medium bg-secondary/50 p-2 rounded">{userNotes}</p>
          </div>
        )}
        {order.receipt_url && (
          <div>
            <p className="text-muted-foreground">Чек оплаты от клиента</p>
            <a
              href={order.receipt_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline inline-flex items-center gap-1"
            >
              📎 Открыть чек
            </a>
          </div>
        )}
      </div>

      <Button 
        variant="gradient" 
        className="w-full"
        onClick={() => onDownloadPDF(order)}
        disabled={downloadingId === order.id}
      >
        {downloadingId === order.id ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Download className="w-4 h-4 mr-2" />
        )}
        Скачать заявку (PDF)
      </Button>
    </div>
  );
};

export default OrdersTable;
