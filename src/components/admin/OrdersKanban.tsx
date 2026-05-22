import { useMemo, useState } from "react";
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

  const [detailsOrder, setDetailsOrder] = useState<Order | null>(null);
  const [payoutOrder, setPayoutOrder] = useState<Order | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const items = grouped[col.key];
          return (
            <div
              key={col.key}
              className={`rounded-xl border ${col.accent} flex flex-col min-h-[200px]`}
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
                      onDetails={() => setDetailsOrder(order)}
                      onPayout={() => setPayoutOrder(order)}
                      onDownload={() => handleDownload(order)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

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

  const fmt = (n: number) =>
    n < 1 ? n.toFixed(4) : n.toLocaleString("ru-RU", { maximumFractionDigits: 2 });

  const idShort = order.id.slice(0, 8);
  const age = formatDistanceToNowStrict(new Date(order.created_at), { locale: ru, addSuffix: true });

  return (
    <div
      className={`rounded-lg border bg-card px-3 py-2.5 space-y-2 transition-colors ${
        isUrgent ? "border-red-500/60 ring-1 ring-red-500/20" : "border-border/40"
      }`}
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
