import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
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

interface PayoutConfirmDialogProps {
  order: Order | null;
  onClose: () => void;
}

const FIAT_CODES = ["RUB", "USD", "EUR", "KGS", "KZT", "UZS"];

export default function PayoutConfirmDialog({ order, onClose }: PayoutConfirmDialogProps) {
  const [txHash, setTxHash] = useState("");
  const markCompleted = useMarkOrderCompleted();

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
        onSuccess: () => {
          toast.success("Выплата подтверждена", {
            description: "Заявка переведена в статус «Завершён»",
          });
          setTxHash("");
          onClose();
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
              <Input
                id="tx-hash"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder={hashPlaceholder}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Сохранится в карточке заявки для аудита. Можно оставить пустым.
              </p>
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
