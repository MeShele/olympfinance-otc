import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Wallet, MessageSquare, ArrowRight, CheckCircle2, Copy, Clock, Globe, QrCode } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/edgeInvoke";
import { useAuth } from "@/hooks/useAuth";
import type { NetworkWallet } from "@/components/admin/NetworkWalletField";
import type { BankAccount } from "@/hooks/useCurrencies";

/** Display labels for common network codes */
const NETWORK_LABELS: Record<string, string> = {
  TRC20: 'Tron (TRC20)',
  ERC20: 'Ethereum (ERC20)',
  BEP20: 'BSC (BEP20)',
  Bitcoin: 'Bitcoin',
  TON: 'TON',
  Solana: 'Solana',
  Polygon: 'Polygon',
  Arbitrum: 'Arbitrum',
  Optimism: 'Optimism',
  Avalanche: 'Avalanche',
};

interface PaymentInfo {
  id: string;
  walletAddress: string;
  network: string;
  amount: number;
  currency: string;
  expiresAt: string;
  qrCode?: string;
  paymentUrl?: string;
  /** For fiat payments — structured bank details */
  bankDetails?: string;
  /** 'crypto' = send to wallet, 'fiat' = send to bank */
  paymentType?: 'crypto' | 'fiat';
}

interface OrderFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderData: {
    fromAmount: number;
    fromCurrency: string;
    fromCurrencyIcon: string;
    toAmount: number;
    toCurrency: string;
    toCurrencyIcon: string;
    rate: number;
    direction: 'buy' | 'sell' | 'swap';
    network?: string | null;
    networks?: string[];
    /** Networks of the from-currency (used for SWAP send-side) */
    fromNetworks?: string[];
  };
  onSubmit: (walletAddress: string, contactInfo: string, notes?: string, network?: string) => Promise<{ orderId?: string; paymentInfo?: PaymentInfo } | undefined>;
  adminWallets?: NetworkWallet[];
  bankAccounts?: BankAccount[];
}

type PaymentStatus = 'pending' | 'confirmed' | 'expired';

interface PaymentState {
  info: PaymentInfo;
  orderId: string;
}

const OrderFormModal = ({ open, onOpenChange, orderData, onSubmit, adminWallets, bankAccounts }: OrderFormModalProps) => {
  const { user } = useAuth();
  // OTC build never ships with finik-acquiring, so the QR-pay path is
  // permanently disabled — manual fiat-bank flow only.
  const hasFinik = false;
  const [walletAddress, setWalletAddress] = useState("");
  const [senderWallet, setSenderWallet] = useState("");
  const [bankName, setBankName] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [notes, setNotes] = useState("");
  // ГСФР Приложения 4/о, 5/о требуют признака «наличный/безналичный».
  // Дефолт: cashless (банк/карта/крипта-перевод), cash — для P2P/OTC.
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "cashless">("cashless");
  const [selectedNetwork, setSelectedNetwork] = useState("");
  /** For SWAP: separate send-side network (fromCurrency) */
  const [selectedFromNetwork, setSelectedFromNetwork] = useState("");
  /** For SWAP: separate receive-side network (toCurrency) */
  const [selectedToNetwork, setSelectedToNetwork] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [paymentState, setPaymentState] = useState<PaymentState | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [savedWallets, setSavedWallets] = useState<string[]>([]);
  const [isCreatingFinikPayment, setIsCreatingFinikPayment] = useState(false);

  /**
   * Kick off a Finik QR payment for the already-created buy-order.
   * paymentInfo.id here is the order id (see useBuyOrder.ts). The webhook
   * updates orders.status → 'paid' by matching the order id stored in the payment record.
   */
  const payViaFinik = async (orderId: string, amount: number) => {
    setIsCreatingFinikPayment(true);
    try {
      const data = await invokeEdgeFunction<{ paymentUrl?: string }>("finik-payment-create", {
        amount,
        orderId,
        redirectUrl: `${window.location.origin}/orders?finik_paid=${orderId}`,
        description: `Обмен ${orderData.fromCurrency} → ${orderData.toCurrency}`,
      });
      const paymentUrl = data?.paymentUrl;
      if (!paymentUrl) throw new Error("Finik не вернул ссылку на оплату");
      window.location.href = paymentUrl;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Не удалось создать QR-платёж";
      toast.error(msg);
      setIsCreatingFinikPayment(false);
    }
  };

  // Load previously used wallets
  useEffect(() => {
    if (!open || !user?.id) return;
    const loadSavedWallets = async () => {
      const { data } = await supabase
        .from("orders")
        .select("wallet_address")
        .eq("user_id", user.id)
        .not("wallet_address", "is", null)
        .order("created_at", { ascending: false })
        .limit(10);
      if (data) {
        const unique = [...new Set(data.map(o => o.wallet_address).filter(Boolean) as string[])];
        setSavedWallets(unique);
      }
    };
    loadSavedWallets();
  }, [open, user?.id]);

  const isSellDirection = orderData.direction === 'sell';
  const isSwapDirection = orderData.direction === 'swap';
  const isBuyDirection = orderData.direction === 'buy';
  const isBuyOrSwap = isBuyDirection || isSwapDirection;
  const needsSenderWallet = isSellDirection || isSwapDirection;

  // Find operator wallet for the selected send network (for inline display in SELL/SWAP)
  const operatorWallet = useMemo(() => {
    const net = isSwapDirection ? selectedFromNetwork : selectedNetwork;
    if (!net || !adminWallets?.length) return null;
    return adminWallets.find(w => w.network.toUpperCase() === net.toUpperCase()) || null;
  }, [selectedNetwork, selectedFromNetwork, isSwapDirection, adminWallets]);

  // Networks from currency data (configured in admin)
  const networkCodes = orderData.networks || [];
  const availableNetworks = networkCodes.map(code => ({
    value: code,
    label: NETWORK_LABELS[code] || code,
  }));
  const hasMultipleNetworks = availableNetworks.length > 1;

  // SWAP: from-side networks (fromCurrency networks)
  const fromNetworkCodes = orderData.fromNetworks || [];
  const availableFromNetworks = fromNetworkCodes.map(code => ({
    value: code,
    label: NETWORK_LABELS[code] || code,
  }));
  const hasMultipleFromNetworks = availableFromNetworks.length > 1;

  // SWAP: to-side networks (toCurrency networks) — same as availableNetworks
  const availableToNetworks = availableNetworks;
  const hasMultipleToNetworks = hasMultipleNetworks;

  // Auto-select network when only one is available
  useEffect(() => {
    if (availableNetworks.length === 1 && !selectedNetwork) {
      setSelectedNetwork(availableNetworks[0].value);
    }
  }, [availableNetworks, selectedNetwork]);

  // Auto-select SWAP from-network when only one is available
  useEffect(() => {
    if (isSwapDirection && availableFromNetworks.length === 1 && !selectedFromNetwork) {
      setSelectedFromNetwork(availableFromNetworks[0].value);
    }
  }, [isSwapDirection, availableFromNetworks, selectedFromNetwork]);

  // Auto-select SWAP to-network when only one is available
  useEffect(() => {
    if (isSwapDirection && availableToNetworks.length === 1 && !selectedToNetwork) {
      setSelectedToNetwork(availableToNetworks[0].value);
    }
  }, [isSwapDirection, availableToNetworks, selectedToNetwork]);

  // Network info for crypto side (use selected or fallback to order data)
  const cryptoNetwork = isSwapDirection
    ? (selectedFromNetwork && selectedToNetwork ? `${selectedFromNetwork} → ${selectedToNetwork}` : null)
    : (selectedNetwork || orderData.network || null);

  // Timer for payment expiration
  useEffect(() => {
    if (!paymentState?.info.expiresAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expires = new Date(paymentState.info.expiresAt).getTime();
      const diff = Math.max(0, Math.floor((expires - now) / 1000));
      setTimeLeft(diff);

      if (diff === 0) {
        setPaymentStatus('expired');
        toast.error('Время оплаты истекло');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [paymentState?.info.expiresAt]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getWalletLabel = () => {
    if (isSellDirection) {
      return 'Номер карты или счёта';
    }
    return `Адрес ${orderData.toCurrency} кошелька`;
  };

  const getWalletPlaceholder = () => {
    if (isSellDirection) {
      return '4169 XXXX XXXX XXXX';
    }
    return `Введите адрес ${orderData.toCurrency} кошелька`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!walletAddress.trim()) {
      if (isSellDirection) {
        toast.error('Укажите номер карты или счёта (обязательное поле)');
      } else {
        toast.error('Укажите адрес кошелька (обязательное поле)');
      }
      return;
    }

    // Validate wallet address format
    if (isBuyOrSwap) {
      const wallet = walletAddress.trim();
      if (wallet.length < 26 || wallet.length > 128) {
        toast.error('Адрес кошелька должен содержать от 26 до 128 символов');
        return;
      }
      if (!/^[A-Za-z0-9]+$/.test(wallet)) {
        toast.error('Адрес кошелька должен содержать только буквы и цифры');
        return;
      }
    } else {
      if (walletAddress.trim().length < 8) {
        toast.error('Укажите корректные реквизиты (минимум 8 символов)');
        return;
      }
    }

    // Validate network selection
    if (isSwapDirection) {
      if (availableFromNetworks.length > 0 && !selectedFromNetwork) {
        toast.error('Выберите сеть отправки');
        return;
      }
      if (availableToNetworks.length > 0 && !selectedToNetwork) {
        toast.error('Выберите сеть получения');
        return;
      }
    } else if (availableNetworks.length > 0 && !selectedNetwork) {
      toast.error('Выберите сеть');
      return;
    }

    if (!contactInfo.trim()) {
      toast.error('Укажите контактные данные');
      return;
    }

    // Validate sender wallet for sell/swap
    if (needsSenderWallet && !senderWallet.trim()) {
      toast.error('Укажите адрес кошелька, с которого отправляете');
      return;
    }
    if (needsSenderWallet && senderWallet.trim()) {
      const sw = senderWallet.trim();
      if (sw.length < 26 || sw.length > 128) {
        toast.error('Адрес кошелька отправителя должен содержать от 26 до 128 символов');
        return;
      }
    }

    // For sell orders, validate bank name and recipient name
    if (isSellDirection) {
      if (!bankName.trim()) {
        toast.error('Укажите название банка');
        return;
      }
      if (!recipientName.trim()) {
        toast.error('Укажите ФИО получателя');
        return;
      }
    }

    // Build notes JSON
    let finalNotes: string | undefined;
    if (isSellDirection) {
      finalNotes = JSON.stringify({
        bank_name: bankName.trim(),
        recipient_name: recipientName.trim(),
        sender_wallet: senderWallet.trim() || undefined,
        user_notes: notes.trim() || undefined,
        paymentMethod,
      });
    } else if (isSwapDirection) {
      finalNotes = JSON.stringify({
        sender_wallet: senderWallet.trim() || undefined,
        send_network: selectedFromNetwork || undefined,
        receive_network: selectedToNetwork || undefined,
        user_notes: notes.trim() || undefined,
        paymentMethod,
      });
    } else {
      finalNotes = JSON.stringify({
        user_notes: notes.trim() || undefined,
        paymentMethod,
      });
    }

    setIsSubmitting(true);
    try {
      const networkToSubmit = isSwapDirection ? (selectedFromNetwork || undefined) : (selectedNetwork || undefined);
      const result = await onSubmit(walletAddress.trim(), contactInfo.trim(), finalNotes, networkToSubmit);

      if (result?.paymentInfo?.paymentUrl) {
        toast.success('Заявка создана! Перенаправляем на страницу оплаты...');
        setTimeout(() => {
          window.location.href = result.paymentInfo!.paymentUrl!;
        }, 500);
        return;
      }

      // Show payment instructions (bank details for buy, wallet for sell/swap)
      if (result?.paymentInfo && result?.orderId) {
        setPaymentState({
          info: result.paymentInfo,
          orderId: result.orderId,
        });
        if (result.paymentInfo.paymentType === 'fiat') {
          toast.success('Заявка создана! Переведите средства по указанным реквизитам.');
        } else {
          toast.success('Заявка создана! Отправьте крипту на указанный адрес.');
        }
        return;
      }

      setIsSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        resetForm();
      }, 2000);
    } catch (error: any) {
      toast.error(error?.message || 'Ошибка при создании заявки');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setIsSuccess(false);
    setPaymentState(null);
    setWalletAddress("");
    setSenderWallet("");
    setBankName("");
    setRecipientName("");
    setContactInfo("");
    setNotes("");
    setPaymentMethod("cashless");
    setSelectedNetwork("");
    setSelectedFromNetwork("");
    setSelectedToNetwork("");
    setTimeLeft(null);
    setPaymentStatus('pending');
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} скопирован`);
  };

  const formatNumber = (num: number, isCrypto: boolean) => {
    if (isCrypto) {
      if (num < 0.0001) return num.toFixed(8);
      if (num < 0.01) return num.toFixed(6);
      if (num < 1) return num.toFixed(4);
      return num.toFixed(4);
    }
    return num.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getQrSrc = () => {
    if (!paymentState) return null;
    if (paymentState.info.qrCode) return paymentState.info.qrCode;
    const data = paymentState.info.paymentUrl || paymentState.info.walletAddress;
    if (!data) return null;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`;
  };

  const getStatusInfo = () => {
    switch (paymentStatus) {
      case 'confirmed':
        return { text: 'В обработке', color: 'text-green-500', bg: 'bg-green-500/10' };
      case 'expired':
        return { text: 'Истекло', color: 'text-destructive', bg: 'bg-destructive/10' };
      default:
        return { text: 'Ожидание оплаты', color: 'text-primary', bg: 'bg-primary/10' };
    }
  };

  // Compact payment screen
  if (paymentState) {
    const qrSrc = getQrSrc();
    const statusInfo = getStatusInfo();
    const paymentInfo = paymentState.info;
    const isFiatPayment = paymentInfo.paymentType === 'fiat';

    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-sm p-0 overflow-hidden">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                {paymentStatus === 'pending' && <span className="w-2 h-2 rounded-full bg-current animate-pulse" />}
                {statusInfo.text}
              </div>

              {paymentStatus === 'pending' && timeLeft !== null && timeLeft > 0 && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-mono font-bold ${
                  timeLeft < 300 ? 'bg-destructive/15 text-destructive' : 'bg-secondary'
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  {formatTime(timeLeft)}
                </div>
              )}
            </div>

            <div className="text-center py-3 rounded-xl bg-secondary/50">
              <p className="text-xs text-muted-foreground mb-1">Сумма к переводу</p>
              <div className="flex items-baseline justify-center gap-1.5">
                <span className="text-2xl font-bold">{paymentInfo.amount}</span>
                <span className="text-lg font-medium text-muted-foreground">{paymentInfo.currency}</span>
              </div>
              {!isFiatPayment && paymentInfo.network && (
                <p className="text-xs text-muted-foreground mt-1">Сеть: {paymentInfo.network}</p>
              )}
            </div>

            {/* Fiat payment — show bank details */}
            {isFiatPayment && paymentInfo.bankDetails && (
              <div className="space-y-3">
                {/* Finik QR — only for KGS-denominated buy orders on operators that have the module */}
                {hasFinik && orderData.fromCurrency === "KGS" && paymentStatus === "pending" && (
                  <div className="space-y-2">
                    <Button
                      type="button"
                      size="lg"
                      className="w-full"
                      disabled={isCreatingFinikPayment}
                      onClick={() => payViaFinik(paymentInfo.id, paymentInfo.amount)}
                    >
                      {isCreatingFinikPayment ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Создание QR…
                        </>
                      ) : (
                        <>
                          <QrCode className="w-4 h-4 mr-2" />
                          Оплатить через Finik QR
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Или переведите вручную по реквизитам ниже
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Банковские реквизиты для перевода</Label>
                  <div className="rounded-lg bg-secondary/50 p-3 space-y-1">
                    {paymentInfo.bankDetails.split('\n').map((line, i) => (
                      <p key={i} className="text-sm">
                        {line}
                      </p>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => copyToClipboard(paymentInfo.bankDetails!, 'Реквизиты')}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Скопировать реквизиты
                  </Button>
                </div>
              </div>
            )}

            {/* Crypto payment — show wallet address and QR */}
            {!isFiatPayment && (
              <>
                {qrSrc && paymentStatus === 'pending' && (
                  <div className="flex justify-center">
                    <div className="p-2 rounded-xl bg-white">
                      <img src={qrSrc} alt="QR" className="w-32 h-32" loading="lazy" />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Адрес кошелька</Label>
                  <div className="flex gap-2">
                    <Input
                      value={paymentInfo.walletAddress}
                      readOnly
                      className="font-mono text-xs bg-secondary/50"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      onClick={() => copyToClipboard(paymentInfo.walletAddress, 'Адрес')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}

            {paymentStatus === 'pending' && (
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={async () => {
                  setIsConfirmingPayment(true);
                  try {
                    const { error } = await supabase.rpc('confirm_order_payment', { _order_id: paymentState.orderId });
                    if (error) throw error;
                    setPaymentStatus('confirmed');
                    toast.success('Заявка отправлена на проверку');
                  } catch (err: any) {
                    toast.error(err?.message || 'Ошибка при подтверждении');
                  } finally {
                    setIsConfirmingPayment(false);
                  }
                }}
                disabled={isConfirmingPayment}
              >
                {isConfirmingPayment ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Я оплатил
              </Button>
            )}

            {paymentStatus === 'confirmed' && (
              <div className="text-center py-4">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="font-medium">Заявка отправлена на проверку</p>
                <p className="text-sm text-muted-foreground">Оператор проверит оплату и завершит обмен</p>
              </div>
            )}

            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => handleClose(false)}
            >
              Закрыть
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Success screen
  if (isSuccess) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Заявка создана!</h3>
            <p className="text-sm text-muted-foreground">
              Мы свяжемся с вами в ближайшее время для подтверждения обмена
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Order form
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Оформление заявки
          </DialogTitle>
          <DialogDescription>
            Укажите реквизиты для получения средств
          </DialogDescription>
        </DialogHeader>

        {/* Order Summary */}
        <div className="bg-secondary/50 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="text-center">
              <span className="text-2xl">{orderData.fromCurrencyIcon}</span>
              <p className="font-semibold mt-1">
                {formatNumber(orderData.fromAmount, orderData.direction !== 'buy')}
              </p>
              <p className="text-xs text-muted-foreground">{orderData.fromCurrency}</p>
            </div>

            <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />

            <div className="text-center">
              <span className="text-2xl">{orderData.toCurrencyIcon}</span>
              <p className="font-semibold mt-1 text-primary">
                {formatNumber(orderData.toAmount, isBuyOrSwap)}
              </p>
              <p className="text-xs text-muted-foreground">{orderData.toCurrency}</p>
            </div>
          </div>

          {/* Network info */}
          {cryptoNetwork && (
            <div className="flex items-center justify-center gap-1.5 mt-3 pt-3 border-t border-border/50">
              <Globe className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Сеть: <span className="font-medium text-foreground">{cryptoNetwork}</span>
              </span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ========== SWAP: two sections (send + receive) ========== */}
          {isSwapDirection && (
            <>
              {/* --- SEND SECTION --- */}
              <div className="p-3 rounded-xl border border-orange-500/30 bg-orange-500/5 space-y-3">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <ArrowRight className="w-4 h-4 text-orange-500" />
                  Отправка {orderData.fromCurrency}
                </p>

                {/* From-network selector */}
                {availableFromNetworks.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      Сеть отправки
                      <span className="text-destructive">*</span>
                    </Label>
                    {hasMultipleFromNetworks ? (
                      <Select value={selectedFromNetwork} onValueChange={setSelectedFromNetwork}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Выберите сеть отправки" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFromNetworks.map((net) => (
                            <SelectItem key={net.value} value={net.value}>
                              {net.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="px-3 py-2 rounded-md bg-secondary/50 text-sm font-medium">
                        {availableFromNetworks[0].label}
                      </div>
                    )}
                  </div>
                )}

                {/* Sender wallet */}
                <div className="space-y-1.5">
                  <Label htmlFor="senderWallet" className="text-xs flex items-center gap-1">
                    <Wallet className="w-3 h-3" />
                    Ваш кошелёк (откуда отправите)
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="senderWallet"
                    value={senderWallet}
                    onChange={(e) => setSenderWallet(e.target.value)}
                    placeholder={`Адрес ${orderData.fromCurrency} кошелька`}
                    className="font-mono text-sm h-9"
                    required
                  />
                </div>

                {/* Inline operator wallet (where to send) */}
                {operatorWallet && (
                  <div className="p-2.5 rounded-lg bg-secondary/50 space-y-1.5">
                    <p className="text-xs text-muted-foreground">Кошелёк оператора (куда переводить):</p>
                    <div className="flex gap-2">
                      <Input
                        value={operatorWallet.address}
                        readOnly
                        className="font-mono text-xs bg-background/50 h-8"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0 h-8 w-8"
                        onClick={() => copyToClipboard(operatorWallet.address, 'Адрес')}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    {operatorWallet.qr_url && (
                      <div className="flex justify-center pt-1">
                        <img src={operatorWallet.qr_url} alt="QR" className="w-24 h-24 rounded" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* --- RECEIVE SECTION --- */}
              <div className="p-3 rounded-xl border border-green-500/30 bg-green-500/5 space-y-3">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-green-500" />
                  Получение {orderData.toCurrency}
                </p>

                {/* To-network selector */}
                {availableToNetworks.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      Сеть получения
                      <span className="text-destructive">*</span>
                    </Label>
                    {hasMultipleToNetworks ? (
                      <Select value={selectedToNetwork} onValueChange={setSelectedToNetwork}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Выберите сеть получения" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableToNetworks.map((net) => (
                            <SelectItem key={net.value} value={net.value}>
                              {net.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="px-3 py-2 rounded-md bg-secondary/50 text-sm font-medium">
                        {availableToNetworks[0].label}
                      </div>
                    )}
                  </div>
                )}

                {/* Receiving wallet */}
                <div className="space-y-1.5">
                  <Label htmlFor="wallet" className="text-xs flex items-center gap-1">
                    <Wallet className="w-3 h-3" />
                    Кошелёк для получения
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="wallet"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder={`Адрес ${orderData.toCurrency} кошелька`}
                    className="font-mono text-sm h-9"
                    required
                  />

                  {/* Previously used wallets */}
                  {savedWallets.length > 0 && !walletAddress && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Ранее использованные:</p>
                      <div className="flex flex-wrap gap-1">
                        {savedWallets.slice(0, 3).map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => setWalletAddress(w)}
                            className="text-xs px-2 py-1 rounded-md bg-secondary hover:bg-secondary/80 font-mono truncate max-w-[200px]"
                            title={w}
                          >
                            {w.slice(0, 8)}...{w.slice(-6)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ========== BUY: network + receiving wallet ========== */}
          {isBuyDirection && availableNetworks.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />
                Сеть
                <span className="text-destructive">*</span>
              </Label>
              {hasMultipleNetworks ? (
                <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите сеть" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableNetworks.map((net) => (
                      <SelectItem key={net.value} value={net.value}>
                        {net.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="px-3 py-2 rounded-md bg-secondary/50 text-sm font-medium">
                  {availableNetworks[0].label}
                </div>
              )}
            </div>
          )}

          {/* Wallet / Card field (for BUY and SELL only, SWAP has its own above) */}
          {!isSwapDirection && (
            <div className="space-y-2">
              <Label htmlFor="wallet" className="flex items-center gap-1">
                {getWalletLabel()}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="wallet"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder={getWalletPlaceholder()}
                className={isBuyDirection ? "font-mono" : ""}
                required
              />

              {/* Previously used wallets (for buy only) */}
              {isBuyDirection && savedWallets.length > 0 && !walletAddress && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Ранее использованные:</p>
                  <div className="flex flex-wrap gap-1">
                    {savedWallets.slice(0, 3).map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setWalletAddress(w)}
                        className="text-xs px-2 py-1 rounded-md bg-secondary hover:bg-secondary/80 font-mono truncate max-w-[200px]"
                        title={w}
                      >
                        {w.slice(0, 8)}...{w.slice(-6)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bank name for sell orders (required) */}
          {isSellDirection && (
            <div className="space-y-2">
              <Label htmlFor="bankName" className="flex items-center gap-1">
                Название банка
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="bankName"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Например: Оптима Банк, Мбанк, Сбербанк"
                required
              />
            </div>
          )}

          {/* Recipient name for sell orders (required) */}
          {isSellDirection && (
            <div className="space-y-2">
              <Label htmlFor="recipientName" className="flex items-center gap-1">
                ФИО получателя
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="recipientName"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Иванов Иван Иванович"
                required
              />
            </div>
          )}

          {/* Network selector for sell orders */}
          {isSellDirection && availableNetworks.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />
                Сеть отправки крипты
                <span className="text-destructive">*</span>
              </Label>
              {hasMultipleNetworks ? (
                <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите сеть" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableNetworks.map((net) => (
                      <SelectItem key={net.value} value={net.value}>
                        {net.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="px-3 py-2 rounded-md bg-secondary/50 text-sm font-medium">
                  {availableNetworks[0].label}
                </div>
              )}
            </div>
          )}

          {/* Sender wallet for sell orders */}
          {isSellDirection && (
            <div className="space-y-2">
              <Label htmlFor="senderWallet" className="flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5" />
                Адрес вашего крипто-кошелька
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="senderWallet"
                value={senderWallet}
                onChange={(e) => setSenderWallet(e.target.value)}
                placeholder={`Адрес ${orderData.fromCurrency} кошелька, откуда отправляете`}
                className="font-mono"
                required
              />
              <p className="text-xs text-muted-foreground">
                Укажите адрес, с которого будете отправлять {orderData.fromCurrency}
              </p>
            </div>
          )}

          {/* Contact */}
          <div className="space-y-2">
            <Label htmlFor="contact" className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              Контакт для связи
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="contact"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder="Telegram, WhatsApp или email"
              required
            />
          </div>

          {/* Payment Method (для отчётов ГСФР) */}
          <div className="space-y-2">
            <Label>Способ оплаты</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("cashless")}
                className={`p-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                  paymentMethod === "cashless"
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                Безналичный
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                className={`p-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                  paymentMethod === "cash"
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                Наличный
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Используется в отчётности ГСФР (Приложения 4/о, 5/о).
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Комментарий (опционально)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Дополнительная информация к заявке"
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => handleClose(false)}
              disabled={isSubmitting}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              variant="gradient"
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Создание...
                </>
              ) : (
                'Создать заявку'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default OrderFormModal;
