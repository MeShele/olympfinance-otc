import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Clock, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface PaymentData {
  type: 'crypto' | 'fiat';
  wallet_address?: string;
  network?: string;
  qr_url?: string;
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
        <p className="text-xs text-muted-foreground">Сумма к переводу</p>
        <p className="text-lg font-bold">
          {payment.amount} <span className="text-sm font-medium text-muted-foreground">{payment.currency}</span>
        </p>
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

      {/* Confirm payment button */}
      {orderId && onConfirmPayment && (
        <Button
          type="button"
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          onClick={() => onConfirmPayment(orderId)}
          disabled={isConfirming}
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
