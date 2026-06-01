import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Clock, AlertTriangle, CheckCircle2, Loader2, Paperclip, Check, Upload } from "lucide-react";
import { toast } from "sonner";
import { useUploadReceipt } from "@/hooks/useUploadReceipt";

export interface PaymentData {
  type: 'crypto' | 'fiat';
  wallet_address?: string;
  network?: string;
  qr_url?: string;
  /** memo/destination-tag для memo-сетей (TON и др.) — обязателен при отправке */
  memo?: string;
  bank_details?: string;
  amount: number;
  currency: string;
  expires_at: string;
}

interface PaymentInstructionsProps {
  payment: PaymentData;
  orderId?: string;
  onConfirmPayment?: (id: string) => void;
  isConfirming?: boolean;
}

const PaymentInstructions = ({ payment, orderId, onConfirmPayment, isConfirming }: PaymentInstructionsProps) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [receiptUploaded, setReceiptUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadReceipt = useUploadReceipt();

  const handleReceiptFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !orderId) return;
    try {
      await uploadReceipt.mutateAsync({ orderId, file });
      setReceiptUploaded(true);
      toast.success("Чек загружен");
    } catch (err: unknown) {
      toast.error("Не удалось загрузить", { description: (err as Error).message });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (!payment.expires_at) return;

    const updateTimer = () => {
      const now = Date.now();
      const expires = new Date(payment.expires_at).getTime();
      const diff = Math.max(0, Math.floor((expires - now) / 1000));
      setTimeLeft(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [payment.expires_at]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} скопирован`);
  };

  const isExpired = timeLeft !== null && timeLeft <= 0;

  if (isExpired) {
    return (
      <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
        <div className="flex items-center gap-2 text-destructive text-sm font-medium">
          <AlertTriangle className="w-4 h-4" />
          Время на оплату истекло
        </div>
      </div>
    );
  }

  const getQrSrc = () => {
    if (payment.qr_url) return payment.qr_url;
    if (payment.wallet_address) {
      return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(payment.wallet_address)}`;
    }
    return null;
  };

  return (
    <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/10 space-y-3">
      {/* Timer */}
      {timeLeft !== null && timeLeft > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Оплатите в течение</span>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
            timeLeft < 300 ? 'bg-destructive/15 text-destructive' : 'bg-secondary text-foreground'
          }`}>
            <Clock className="w-3 h-3" />
            {formatTime(timeLeft)}
          </div>
        </div>
      )}

      {/* Amount */}
      <div className="text-center py-2 rounded-lg bg-secondary/50">
        <p className="text-xs text-muted-foreground">
          {payment.type === 'crypto' ? 'Отправьте ровно' : 'Сумма к переводу'}
        </p>
        <p className="text-lg font-bold tabular-nums">
          {payment.amount} <span className="text-sm font-medium text-muted-foreground">{payment.currency}</span>
        </p>
        {payment.type === 'crypto' && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-1.5 h-7 text-xs"
            onClick={() => copyToClipboard(String(payment.amount), 'Сумма')}
          >
            <Copy className="w-3 h-3 mr-1.5" />
            Копировать сумму
          </Button>
        )}
      </div>

      {/* Crypto payment */}
      {payment.type === 'crypto' && payment.wallet_address && (
        <div className="space-y-2">
          {/* QR */}
          {(() => {
            const qrSrc = getQrSrc();
            return qrSrc ? (
              <div className="flex justify-center">
                <div className="p-1.5 rounded-lg bg-white">
                  <img src={qrSrc} alt="QR" className="w-28 h-28" loading="lazy" />
                </div>
              </div>
            ) : null;
          })()}

          {/* Network */}
          {payment.network && (
            <p className="text-xs text-center text-muted-foreground">
              Сеть: <span className="font-medium text-foreground">{payment.network}</span>
            </p>
          )}

          {/* Wallet address */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Адрес кошелька</Label>
            <div className="flex gap-1.5">
              <Input
                value={payment.wallet_address}
                readOnly
                className="font-mono text-xs bg-secondary/50 h-8"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0 h-8 w-8"
                onClick={() => copyToClipboard(payment.wallet_address!, 'Адрес')}
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Memo / тег — обязателен для memo-сетей (TON и др.) */}
          {payment.memo && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Memo / Тег (обязательно)</Label>
              <div className="flex gap-1.5">
                <Input value={payment.memo} readOnly className="font-mono text-xs bg-secondary/50 h-8" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0 h-8 w-8"
                  onClick={() => copyToClipboard(payment.memo!, 'Memo')}
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
              <p className="flex items-start gap-1.5 text-[11px] leading-snug text-destructive">
                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                Без memo средства не зачислятся — укажите его при отправке.
              </p>
            </div>
          )}

          {/* Предупреждение о сети — для всей крипты (самая дорогая ошибка) */}
          {payment.network && (
            <div className="flex items-start gap-2 rounded-lg border border-accent/50 bg-accent/10 px-2.5 py-2 text-[11px] leading-snug text-foreground">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                Отправляйте только по сети{" "}
                <span className="font-mono font-semibold">{payment.network}</span>.
                Перевод по другой сети = безвозвратная потеря средств.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Fiat payment */}
      {payment.type === 'fiat' && payment.bank_details && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Банковские реквизиты</Label>
          <div className="rounded-lg bg-secondary/50 p-2.5 space-y-0.5">
            {payment.bank_details.split('\n').map((line, i) => (
              <p key={i} className="text-sm">{line}</p>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={() => copyToClipboard(payment.bank_details!, 'Реквизиты')}
          >
            <Copy className="w-3.5 h-3.5 mr-1.5" />
            Скопировать реквизиты
          </Button>
        </div>
      )}

      {/* Receipt upload (опциональный, но ускоряет проверку оператором) */}
      {orderId && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Paperclip className="w-3 h-3" />
            Чек оплаты (необязательно)
          </Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={handleReceiptFile}
            disabled={uploadReceipt.isPending}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadReceipt.isPending}
          >
            {uploadReceipt.isPending ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : receiptUploaded ? (
              <Check className="w-3.5 h-3.5 mr-1.5 text-green-600" />
            ) : (
              <Upload className="w-3.5 h-3.5 mr-1.5" />
            )}
            {receiptUploaded ? "Чек загружен — можно заменить" : "Прикрепить чек (JPG/PNG/PDF до 5 МБ)"}
          </Button>
          <p className="text-[10px] text-muted-foreground/70 leading-tight">
            Прикрепление чека ускорит проверку оператором, но не обязательно.
          </p>
        </div>
      )}

      {/* Confirm payment button */}
      {orderId && onConfirmPayment && (
        <Button
          type="button"
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          onClick={() => onConfirmPayment(orderId)}
          disabled={isConfirming || uploadReceipt.isPending}
        >
          {isConfirming ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4 mr-2" />
          )}
          Я оплатил
        </Button>
      )}
    </div>
  );
};

export default PaymentInstructions;
