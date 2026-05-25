import { useState } from "react";
import { Loader2, CheckCircle2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useMarkOrderCompleted, type Order } from "@/hooks/useOrders";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useOperatorId } from "@/hooks/useOperatorId";
import { buildCompanyData } from "@/utils/pdf/companyData";
import { saveOrderPdfToStorage } from "@/utils/orderPdfDownload";
import { invokeEdgeFunction } from "@/lib/edgeInvoke";

interface PayoutConfirmDialogProps {
  order: Order | null;
  onClose: () => void;
}

const FIAT_CODES = ["RUB", "USD", "EUR", "KGS", "KZT", "UZS"];

interface ExplorerResult {
  confirmed: boolean;
  confirmations: number;
  from?: string;
  to?: string;
  amount?: string;
  symbol?: string;
  error?: string;
  hint?: string;
}

export default function PayoutConfirmDialog({ order, onClose }: PayoutConfirmDialogProps) {
  const [txHash, setTxHash] = useState("");
  const [explorer, setExplorer] = useState<ExplorerResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const markCompleted = useMarkOrderCompleted();
  const { data: settings } = useCompanySettings();
  const operatorId = useOperatorId();

  const handleCheckTx = async () => {
    if (!txHash.trim() || !order?.network) {
      toast.error("Введите tx-hash и убедитесь что сеть указана");
      return;
    }
    setIsChecking(true);
    setExplorer(null);
    try {
      const data = await invokeEdgeFunction("explorer-check", {
        network: order.network,
        tx_hash: txHash.trim(),
      });
      setExplorer(data as ExplorerResult);
    } catch (e) {
      setExplorer({ confirmed: false, confirmations: 0, error: (e as Error).message });
    } finally {
      setIsChecking(false);
    }
  };

  const isCrypto = order?.to_currency && !FIAT_CODES.includes(order.to_currency);
  const hashLabel = isCrypto ? "Хеш транзакции в блокчейне" : "Номер платёжного поручения";
  const hashPlaceholder = isCrypto
    ? "Например, 0x… или TRC20-хеш"
    : "Опционально — для аудита";

  const handleConfirm = () => {
    if (!order) return;
    markCompleted.mutate(
      { id: order.id, txHash },
      {
        onSuccess: async () => {
          toast.success("Выплата подтверждена", {
            description: "Заявка переведена в статус «Завершён»",
          });
          setTxHash("");
          onClose();
          // Best-effort: автогенерируем PDF и кладём в storage, чтобы клиент
          // при заходе на /orders сразу видел готовый файл (без on-the-fly).
          if (settings) {
            const company = buildCompanyData(settings);
            void saveOrderPdfToStorage(
              { ...order, status: "completed" },
              company,
              operatorId,
            );
          }
        },
        onError: (err: Error) => {
          toast.error("Не удалось подтвердить", { description: err.message });
        },
      }
    );
  };

  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            Подтвердить выплату
          </DialogTitle>
          <DialogDescription>
            Клиент оплатил, вы отправили {order?.to_currency}? После
            подтверждения заявка перейдёт в статус «Завершён».
          </DialogDescription>
        </DialogHeader>

        {order && (
          <div className="space-y-3 text-sm">
            <div className="rounded-lg bg-secondary/30 border border-border/40 px-3 py-2">
              <div className="text-xs text-muted-foreground">Заявка</div>
              <div className="font-mono">
                {order.from_amount} {order.from_currency} → {order.to_amount} {order.to_currency}
              </div>
              <div className="text-xs text-muted-foreground mt-1 truncate">
                {isCrypto ? "Кошелёк получателя" : "Реквизиты"}:{" "}
                {order.wallet_address || order.contact_info || "—"}
              </div>
            </div>

            <div>
              <Label htmlFor="tx-hash" className="text-xs">{hashLabel}</Label>
              <div className="flex gap-1.5">
                <Input
                  id="tx-hash"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder={hashPlaceholder}
                  className="font-mono"
                />
                {isCrypto && order?.network && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCheckTx}
                    disabled={!txHash.trim() || isChecking}
                    title="Проверить в blockchain explorer"
                  >
                    {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Сохранится в карточке заявки для аудита. Можно оставить пустым.
              </p>

              {explorer && !explorer.error && (
                <div className="mt-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1">
                  <div className="flex items-center gap-1.5">
                    {explorer.confirmed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Loader2 className="w-3.5 h-3.5 text-amber-500" />
                    )}
                    <span className="font-medium">
                      {explorer.confirmed ? "Транзакция подтверждена" : "В мемпуле / не подтверждена"}
                    </span>
                    <span className="text-muted-foreground">
                      ({explorer.confirmations} конф.)
                    </span>
                  </div>
                  {explorer.from && <div className="font-mono truncate">From: {explorer.from}</div>}
                  {explorer.to && <div className="font-mono truncate">To: {explorer.to}</div>}
                  {explorer.amount && (
                    <div>Amount: {explorer.amount} {explorer.symbol ?? ""}</div>
                  )}
                </div>
              )}
              {explorer?.error && (
                <div className="mt-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-700 dark:text-red-300">
                  {explorer.error}
                  {explorer.hint && <div className="text-muted-foreground mt-0.5">{explorer.hint}</div>}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={markCompleted.isPending}>
            Отмена
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={markCompleted.isPending}
            className="gap-1.5"
          >
            {markCompleted.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Подтвердить выплату
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
