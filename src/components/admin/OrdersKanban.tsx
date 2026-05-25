import { useMemo, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { useUpdateOrderStatus } from "@/hooks/useOrders";
import {
  Select as SelectStatus,
  SelectContent as SelectStatusContent,
  SelectItem as SelectStatusItem,
  SelectTrigger as SelectStatusTrigger,
  SelectValue as SelectStatusValue,
} from "@/components/ui/select";
import {
  Timer,
  Hourglass,
  CheckCircle2,
  AlertTriangle,
  Download,
  FileText,
  ArrowRight,
  Loader2,
  Eye,
  Paperclip,
} from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { ru } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { type Order } from "@/hooks/useOrders";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useOperatorId } from "@/hooks/useOperatorId";
import { buildCompanyData } from "@/utils/pdf/companyData";
import type { CompanyData } from "@/utils/pdf/types";
import { downloadOrderPDF } from "@/utils/orderPdfDownload";
import PayoutConfirmDialog from "@/components/admin/PayoutConfirmDialog";

interface OrdersKanbanProps {
  orders: Order[];
}

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

const URGENT_THRESHOLD_MS = 60 * 60 * 1000; // 1ч

type ColumnKey = "waiting" | "action_needed" | "done" | "failed";

const COLUMNS: Array<{
  key: ColumnKey;
  title: string;
  statuses: string[];
  icon: React.ReactNode;
  accent: string;
  empty: string;
}> = [
  {
    key: "waiting",
    title: "Ожидает оплаты",
    statuses: ["awaiting_payment", "pending"],
    icon: <Timer className="w-4 h-4" />,
    accent: "border-amber-500/40 bg-amber-500/5",
    empty: "Все заявки оплачены",
  },
  {
    key: "action_needed",
    title: "Ожидает выдачи",
    statuses: ["processing"],
    icon: <Hourglass className="w-4 h-4" />,
    accent: "border-orange-500/60 bg-orange-500/10",
    empty: "Нет заявок, требующих выдачи",
  },
  {
    key: "done",
    title: "Завершено",
    statuses: ["completed"],
    icon: <CheckCircle2 className="w-4 h-4" />,
    accent: "border-emerald-500/40 bg-emerald-500/5",
    empty: "Ещё нет закрытых заявок",
  },
  {
    key: "failed",
    title: "Проблемные",
    statuses: ["cancelled", "expired", "paid"],
    icon: <AlertTriangle className="w-4 h-4" />,
    accent: "border-red-500/40 bg-red-500/5",
    empty: "Нет отменённых",
  },
];

export default function OrdersKanban({ orders }: OrdersKanbanProps) {
  const { data: companySettings } = useCompanySettings();
  const company = companySettings ? buildCompanyData(companySettings) : DEFAULT_COMPANY;
  const operatorId = useOperatorId();
  const updateStatus = useUpdateOrderStatus();

  const [detailsOrder, setDetailsOrder] = useState<Order | null>(null);
  const [payoutOrder, setPayoutOrder] = useState<Order | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [failedDropOrder, setFailedDropOrder] = useState<Order | null>(null);

  // PointerSensor с distance: чтобы клики по кнопкам внутри карточки не
  // регистрировались как drag-start.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const orderId = event.active.id as string;
    const targetCol = event.over?.id as ColumnKey | undefined;
    if (!targetCol) return;

    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    const srcCol = COLUMNS.find((c) => c.statuses.includes(order.status))?.key ?? "failed";
    if (srcCol === targetCol) return;

    // action_needed → done: только через PayoutConfirmDialog (нужен tx-hash для аудита)
    if (targetCol === "done" && order.status === "processing") {
      setPayoutOrder(order);
      return;
    }

    // → failed: даём выбрать cancelled / expired через мини-меню
    if (targetCol === "failed") {
      setFailedDropOrder(order);
      return;
    }

    // Простые переходы: → awaiting_payment / → processing / → completed (если ордер уже paid и т.п.)
    const targetStatus =
      targetCol === "waiting" ? "awaiting_payment" :
      targetCol === "action_needed" ? "processing" :
      targetCol === "done" ? "completed" : null;

    if (!targetStatus) return;
    updateStatus.mutate(
      { id: order.id, status: targetStatus },
      {
        onSuccess: () => toast.success("Статус обновлён"),
        onError: (e: Error) => toast.error("Не удалось", { description: e.message }),
      }
    );
  };

  const grouped = useMemo(() => {
    const byKey: Record<ColumnKey, Order[]> = {
      waiting: [], action_needed: [], done: [], failed: [],
    };
    for (const o of orders) {
      const col = COLUMNS.find((c) => c.statuses.includes(o.status));
      if (col) byKey[col.key].push(o);
      else byKey.failed.push(o);
    }
    return byKey;
  }, [orders]);

  const handleDownload = async (order: Order) => {
    setDownloadingId(order.id);
    try {
      await downloadOrderPDF(order, company, operatorId);
    } catch (err) {
      console.error("PDF download failed:", err);
      toast.error("Ошибка", { description: "Не удалось сгенерировать PDF" });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNS.map((col) => (
            <DroppableColumn
              key={col.key}
              col={col}
              items={grouped[col.key]}
              downloadingId={downloadingId}
              onDetails={setDetailsOrder}
              onPayout={setPayoutOrder}
              onDownload={handleDownload}
            />
          ))}
        </div>
      </DndContext>

      {/* Мини-диалог: drop в «Проблемные» → выбрать cancelled / expired */}
      <FailedDropDialog
        order={failedDropOrder}
        onClose={() => setFailedDropOrder(null)}
        onPick={(status) => {
          if (!failedDropOrder) return;
          updateStatus.mutate(
            { id: failedDropOrder.id, status },
            {
              onSuccess: () => toast.success("Заявка отмечена"),
              onError: (e: Error) => toast.error("Не удалось", { description: e.message }),
            }
          );
          setFailedDropOrder(null);
        }}
      />

      {/* Details Dialog */}
      <Dialog open={!!detailsOrder} onOpenChange={() => setDetailsOrder(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Детали заявки
            </DialogTitle>
          </DialogHeader>
          {detailsOrder && <OrderDetailsBlock order={detailsOrder} />}
        </DialogContent>
      </Dialog>

      <PayoutConfirmDialog order={payoutOrder} onClose={() => setPayoutOrder(null)} />
    </>
  );
}

// ───────────────────────── Card ─────────────────────────

interface OrderCardProps {
  order: Order;
  column: ColumnKey;
  downloading: boolean;
  onDetails: () => void;
  onPayout: () => void;
  onDownload: () => void;
}

function OrderCard({ order, column, downloading, onDetails, onPayout, onDownload }: OrderCardProps) {
  const ageMs = Date.now() - new Date(order.created_at).getTime();
  const isUrgent = column === "action_needed" && ageMs > URGENT_THRESHOLD_MS;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: order.id });

  const fmt = (n: number) =>
    n < 1 ? n.toFixed(4) : n.toLocaleString("ru-RU", { maximumFractionDigits: 2 });

  const idShort = order.id.slice(0, 8);
  const age = formatDistanceToNowStrict(new Date(order.created_at), { locale: ru, addSuffix: true });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`rounded-lg border bg-card px-3 py-2.5 space-y-2 transition-colors cursor-grab active:cursor-grabbing ${
        isUrgent ? "border-red-500/60 ring-1 ring-red-500/20" : "border-border/40"
      } ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono text-muted-foreground">#{idShort}</span>
        <span className="text-muted-foreground">{age}</span>
        {isUrgent && (
          <Badge variant="destructive" className="text-[10px] ml-1 py-0">⚠ Срочно</Badge>
        )}
      </div>

      {order.user_email && (
        <div className="text-xs truncate" title={order.user_email}>
          {order.user_email}
        </div>
      )}

      <div className="flex items-center gap-1.5 text-sm font-medium">
        <span>{fmt(order.from_amount)} {order.from_currency}</span>
        <ArrowRight className="w-3 h-3 text-muted-foreground" />
        <span className="text-primary">{fmt(order.to_amount)} {order.to_currency}</span>
      </div>

      {order.network && (
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Сеть: {order.network}
        </div>
      )}

      {/* Главная кнопка действия — зависит от колонки */}
      {column === "action_needed" && (
        <Button onClick={onPayout} size="sm" className="w-full gap-1.5">
          <CheckCircle2 className="w-4 h-4" />
          Подтвердить выплату
        </Button>
      )}
      {column === "waiting" && (
        <Button onClick={onDetails} size="sm" variant="secondary" className="w-full gap-1.5">
          <Eye className="w-4 h-4" />
          Посмотреть реквизиты
        </Button>
      )}
      {column === "done" && (
        <Button
          onClick={onDownload}
          disabled={downloading}
          size="sm"
          variant="secondary"
          className="w-full gap-1.5"
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Скачать PDF
        </Button>
      )}
      {column === "failed" && (
        <Button onClick={onDetails} size="sm" variant="secondary" className="w-full gap-1.5">
          <Eye className="w-4 h-4" />
          Открыть детали
        </Button>
      )}

      {/* Чек оплаты от клиента (если приложил) */}
      {order.receipt_url && (
        <a
          href={order.receipt_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-primary hover:underline -mt-0.5"
        >
          <Paperclip className="w-3 h-3" />
          Чек оплаты от клиента
        </a>
      )}

      {/* Вторичные действия */}
      <div className="flex justify-between pt-1 border-t border-border/30 -mx-3 px-3 mt-1">
        <Button onClick={onDetails} size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground">
          Детали
        </Button>
        <Button onClick={onDownload} disabled={downloading} size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground">
          PDF
        </Button>
      </div>
    </div>
  );
}

// ───────────────────────── Droppable column ─────────────────────────

interface DroppableColumnProps {
  col: typeof COLUMNS[number];
  items: Order[];
  downloadingId: string | null;
  onDetails: (o: Order) => void;
  onPayout: (o: Order) => void;
  onDownload: (o: Order) => void;
}

function DroppableColumn({ col, items, downloadingId, onDetails, onPayout, onDownload }: DroppableColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: col.key });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border ${col.accent} flex flex-col min-h-[200px] transition-all ${
        isOver ? "ring-2 ring-primary/60 ring-offset-2 ring-offset-background" : ""
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          {col.icon}
          <h3 className="font-semibold text-sm">{col.title}</h3>
        </div>
        <Badge variant="secondary" className="font-mono">{items.length}</Badge>
      </div>

      <div className="p-3 space-y-3 flex-1">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 text-center py-8">{col.empty}</p>
        ) : (
          items.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              column={col.key}
              downloading={downloadingId === order.id}
              onDetails={() => onDetails(order)}
              onPayout={() => onPayout(order)}
              onDownload={() => onDownload(order)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ───────────────────────── Failed-drop dialog ─────────────────────────

function FailedDropDialog({
  order,
  onClose,
  onPick,
}: {
  order: Order | null;
  onClose: () => void;
  onPick: (status: string) => void;
}) {
  const [status, setStatus] = useState<string>("cancelled");
  return (
    <Dialog open={!!order} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Пометить как проблемную</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Заявка <span className="font-mono">#{order?.id.slice(0, 8)}</span> — что произошло?
          </p>
          <SelectStatus value={status} onValueChange={setStatus}>
            <SelectStatusTrigger><SelectStatusValue /></SelectStatusTrigger>
            <SelectStatusContent>
              <SelectStatusItem value="cancelled">Отменена клиентом / нами</SelectStatusItem>
              <SelectStatusItem value="expired">Истекла (нет оплаты)</SelectStatusItem>
            </SelectStatusContent>
          </SelectStatus>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Отмена</Button>
            <Button className="flex-1" onClick={() => onPick(status)}>Подтвердить</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────── Details block ─────────────────────────

function OrderDetailsBlock({ order }: { order: Order }) {
  const fmt = (n: number) =>
    n < 1 ? n.toFixed(4) : n.toLocaleString("ru-RU", { maximumFractionDigits: 2 });

  return (
    <div className="space-y-3 text-sm">
      <Row label="ID" value={<span className="font-mono">#{order.id.slice(0, 8)}</span>} />
      <Row label="Создана" value={format(new Date(order.created_at), "dd MMM yyyy, HH:mm", { locale: ru })} />
      <Row label="Клиент" value={order.user_email ?? order.contact_info ?? "—"} />
      <Row
        label="Обмен"
        value={
          <span className="font-mono">
            {fmt(order.from_amount)} {order.from_currency} → {fmt(order.to_amount)} {order.to_currency}
          </span>
        }
      />
      <Row label="Курс" value={<span className="font-mono">{fmt(order.rate)}</span>} />
      {order.network && <Row label="Сеть" value={order.network} />}
      {order.wallet_address && (
        <Row
          label="Кошелёк / Карта получателя"
          value={<span className="font-mono break-all">{order.wallet_address}</span>}
        />
      )}
      {order.contact_info && order.contact_info !== order.wallet_address && (
        <Row label="Контакт" value={<span className="break-all">{order.contact_info}</span>} />
      )}
      {order.receipt_url && (
        <Row
          label="Чек оплаты"
          value={
            <a
              href={order.receipt_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              <Paperclip className="w-3 h-3" />
              Открыть
            </a>
          }
        />
      )}
      {order.notes && <Row label="Заметки" value={<span className="text-xs whitespace-pre-wrap break-all">{order.notes}</span>} />}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground text-xs uppercase tracking-wide shrink-0">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
