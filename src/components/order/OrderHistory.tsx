import * as React from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  Eye,
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ArrowRight,
  Plus,
  RefreshCw
} from "lucide-react";
import { generateOrderNumber } from "@/utils/orderDocument";
import { PDFPreviewModal } from "./PDFPreviewModal";
import PaymentInstructions, { type PaymentData } from "./PaymentInstructions";
import type { OrderData, CompanyData, KycData } from "@/utils/pdf/types";
import { Link } from "react-router-dom";
import { useConfirmPayment } from "@/hooks/useOrders";
import {
  getOrderStatusColor,
  getOrderStatusLabel,
  type OrderStatusColor,
} from "@/lib/orderStatus";
import { toast } from "sonner";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { buildCompanyData } from "@/utils/pdf/companyData";
import { generateAndSaveOrderPDF, getDocumentDownloadUrl } from "@/utils/pdf/documentService";
import { useOperatorId } from "@/hooks/useOperatorId";
import {
  parsePaymentInfo,
  parseBankInfo,
  parseBuyPaymentInfo,
  formatPaymentMethod,
} from "@/utils/orderNotes";

interface Order {
  id: string;
  from_amount: number;
  from_currency: string;
  to_amount: number;
  to_currency: string;
  rate: number;
  status: string;
  wallet_address: string | null;
  contact_info: string | null;
  notes: string | null;
  network: string | null;
  created_at: string;
  updated_at: string;
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

const OrderHistory = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { user } = useAuth();
  const [previewOrder, setPreviewOrder] = useState<OrderData | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const confirmPayment = useConfirmPayment();
  const { data: companySettings } = useCompanySettings();
  const company = companySettings ? buildCompanyData(companySettings) : DEFAULT_COMPANY;
  const operatorId = useOperatorId();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Finik return: they redirect back here with ?finik_paid=<uuid> (we set
  // it in redirectUrl) or ?finik_paid=succeeded (their gateway overrides
  // the value in some cases). Either way the signal is "payment flow
  // finished" — invalidate the orders list so the webhook's paid update
  // shows up immediately instead of waiting for refetchOnFocus.
  useEffect(() => {
    if (searchParams.has("finik_paid")) {
      toast.success("Платёж через Finik получен, заявка обновляется…");
      queryClient.invalidateQueries({ queryKey: ["user-orders", user?.id] });
      searchParams.delete("finik_paid");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, queryClient, user?.id]);

  const handleConfirmPayment = async (orderId: string) => {
    try {
      await confirmPayment.mutateAsync(orderId);
      toast.success('Заявка отправлена на проверку');
    } catch (err: any) {
      toast.error(err?.message || 'Ошибка при подтверждении оплаты');
    }
  };

  // Fetch user profile for full name
  const { data: profile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: orders, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['user-orders', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
    enabled: !!user,
  });

  const getStatusConfig = (status: string) => {
    const color = getOrderStatusColor(status);
    const label = getOrderStatusLabel(status);

    const bgByColor: Record<OrderStatusColor, string> = {
      amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      red: 'bg-destructive/10 text-destructive border-destructive/20',
      gray: 'bg-secondary/50 text-muted-foreground border-border/20',
    };
    const iconByStatus: Record<string, React.ReactNode> = {
      awaiting_payment: <Clock className="w-3.5 h-3.5" />,
      pending: <Clock className="w-3.5 h-3.5" />,
      paid: <CheckCircle2 className="w-3.5 h-3.5" />,
      processing: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
      completed: <CheckCircle2 className="w-3.5 h-3.5" />,
      cancelled: <XCircle className="w-3.5 h-3.5" />,
      expired: <XCircle className="w-3.5 h-3.5" />,
    };

    return {
      variant: (color === 'red' ? 'destructive' : color === 'emerald' ? 'default' : 'secondary') as
        'default' | 'secondary' | 'destructive' | 'outline',
      icon: iconByStatus[status] ?? <Clock className="w-3.5 h-3.5" />,
      label,
      bgColor: bgByColor[color],
    };
  };

  const formatNumber = (num: number, currency: string) => {
    const cryptoCurrencies = ['BTC', 'ETH', 'USDT', 'USDC', 'TON', 'SOL'];
    const isCrypto = cryptoCurrencies.includes(currency);
    
    if (isCrypto) {
      if (num < 0.0001) return num.toFixed(8);
      if (num < 0.01) return num.toFixed(6);
      if (num < 1) return num.toFixed(4);
      return num.toFixed(4);
    }
    return num.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Parse user comment from order notes
  const parseUserNotes = (notes: string | null): string | null => {
    if (!notes) return null;
    try {
      const parsed = JSON.parse(notes);
      return parsed.user_notes || null;
    } catch {
      return notes.trim() || null;
    }
  };

  // Parse new payment data from order notes
  const parsePaymentData = (notes: string | null): PaymentData | null => {
    if (!notes) return null;
    try {
      const parsed = JSON.parse(notes);
      if (parsed?.payment && parsed.payment.type) {
        return parsed.payment as PaymentData;
      }
    } catch {}
    return null;
  };

  // Get client display name
  const getClientName = () => {
    if (profile?.full_name) return profile.full_name;
    return user?.email || 'Клиент';
  };

  /**
   * Pull the latest KYC verification for the order's user and normalize
   * identity fields. Providers (BV, manual, SumSub, Didit) store different
   * shapes — this is the one place that flattens them into KycData for the
   * PDF template.
   */
  const fetchKycForOrder = async (userId: string | null): Promise<KycData | undefined> => {
    if (!userId) return undefined;
    const { data: kyc } = await supabase
      .from('kyc_verifications')
      .select('document_number, document_type, document_country, ocr_data, verification_method, verified_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!kyc) return undefined;

    const ocr = (kyc.ocr_data ?? {}) as Record<string, unknown>;
    const pick = (k: string): string | undefined => {
      const v = ocr[k];
      return typeof v === 'string' && v.trim() ? v : undefined;
    };

    const first = pick('first_name');
    const last = pick('last_name');
    const middle = pick('patronymic') ?? pick('middle_name');
    const fullName = pick('full_name')
      ?? ([last, first, middle].filter(Boolean).join(' ') || undefined);

    return {
      fullName,
      firstName: first,
      lastName: last,
      middleName: middle,
      dateOfBirth: pick('date_of_birth'),
      country: pick('country') ?? (kyc.document_country ?? undefined),
      documentType: pick('document_type') ?? (kyc.document_type ?? undefined),
      documentNumber: pick('document_number') ?? (kyc.document_number ?? undefined),
      documentSeries: pick('document_series'),
      personalNumber: pick('personal_number') ?? pick('pin'),
      issuedDate: pick('issued_date') ?? pick('date_of_issue'),
      expiryDate: pick('expired_date') ?? pick('date_of_expiry'),
      authority: pick('authority') ?? pick('issued_by'),
      address: pick('address'),
      verificationMethod: kyc.verification_method ?? undefined,
      verifiedAt: kyc.verified_at ?? undefined,
    };
  };

  const handlePreviewPDF = async (order: Order) => {
    const orderNumber = generateOrderNumber(order.id, order.created_at);

    // Determine order type (sell = crypto to fiat)
    const cryptoCurrencies = ['BTC', 'ETH', 'USDT', 'USDC', 'TON', 'SOL'];
    const isSellOrder = cryptoCurrencies.includes(order.from_currency) &&
                        !cryptoCurrencies.includes(order.to_currency);
    const isBuyOrder = !cryptoCurrencies.includes(order.from_currency) &&
                       cryptoCurrencies.includes(order.to_currency);

    // Парсим все варианты JSON-блобов из order.notes — те же парсеры что и
    // в админском OrdersTable, чтобы у клиента в PDF не пропадали поля,
    // которые видит оператор.
    const paymentInfo = parsePaymentInfo(order.notes);
    const bankInfo = parseBankInfo(order.notes);
    const buyPaymentInfo = isBuyOrder ? parseBuyPaymentInfo(order.notes) : null;
    const operatorWallet = paymentInfo?.wallet_address || '';

    const clientName = getClientName();
    const kyc = await fetchKycForOrder(order.user_id);

    const orderData: OrderData = {
      id: order.id,
      orderNumber,
      createdAt: order.created_at,
      clientName: kyc?.fullName || clientName,
      clientContact: order.contact_info || '',
      fromAmount: order.from_amount,
      fromCurrency: order.from_currency,
      toAmount: order.to_amount,
      toCurrency: order.to_currency,
      rate: order.rate,
      walletAddress: isSellOrder ? '' : (order.wallet_address || ''),
      operatorWallet,
      status: order.status,
      fee: (order as { fee?: number }).fee ?? undefined,
      cardNumber: isSellOrder ? (order.wallet_address || '') : undefined,
      bankName: bankInfo?.bank_name,
      recipientName: isSellOrder
        ? (bankInfo?.recipient_name || kyc?.fullName || clientName)
        : bankInfo?.recipient_name,
      senderWallet: bankInfo?.sender_wallet,
      bankAccountInfo: buyPaymentInfo?.bankDetails,
      networkName: order.network || undefined,
      paymentMethod: formatPaymentMethod(order as { payment_method?: string | null; notes?: string | null }),
      kyc,
    };

    setPreviewOrder(orderData);
    setIsPreviewOpen(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) {
    return (
      <div ref={ref} className={className} {...props}>
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">Войдите для просмотра истории заявок</p>
            <Button asChild variant="gradient">
              <Link to="/auth">Войти в аккаунт</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div ref={ref} className={className} {...props}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <Skeleton className="h-7 w-40 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="h-6 w-28 rounded-full" />
                  </div>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-32" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-12 w-32" />
                  </div>
                </div>
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div ref={ref} className={className} {...props}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">История заявок</h2>
            <p className="text-sm text-muted-foreground">Ваши операции обмена</p>
          </div>
        </div>
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-amber-700/10 flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">У вас пока нет заявок</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Создайте вашу первую заявку на обмен криптовалюты
            </p>
            <Button asChild variant="gradient" size="lg">
              <Link to="/" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Создать заявку
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div ref={ref} className={className} {...props}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">История заявок</h2>
          <p className="text-sm text-muted-foreground">
            {orders.length} {orders.length === 1 ? 'заявка' : orders.length < 5 ? 'заявки' : 'заявок'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
          <Button asChild variant="gradient" size="sm">
            <Link to="/" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Новая заявка
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {orders.map((order) => {
          const orderNumber = generateOrderNumber(order.id, order.created_at);
          const statusConfig = getStatusConfig(order.status);
          
          return (
            <Card key={order.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                {/* Order Header */}
                <div className="p-5 pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-mono text-sm font-semibold text-foreground">{orderNumber}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(order.created_at)}
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`flex items-center gap-1.5 px-3 py-1 ${statusConfig.bgColor}`}
                    >
                      {statusConfig.icon}
                      {statusConfig.label}
                    </Badge>
                  </div>

                  {/* Exchange Details */}
                  <div className="flex items-center justify-between bg-secondary/30 rounded-xl p-4">
                    <div className="text-center flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Отдаёте</p>
                      <p className="text-lg font-bold">
                        {formatNumber(order.from_amount, order.from_currency)}
                      </p>
                      <p className="text-sm text-muted-foreground">{order.from_currency}</p>
                    </div>
                    
                    <div className="px-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <ArrowRight className="w-5 h-5 text-primary" />
                      </div>
                    </div>
                    
                    <div className="text-center flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Получаете</p>
                      <p className="text-lg font-bold text-primary">
                        {formatNumber(order.to_amount, order.to_currency)}
                      </p>
                      <p className="text-sm text-muted-foreground">{order.to_currency}</p>
                    </div>
                  </div>

                  {/* Client & Payment Details */}
                  <div className="mt-4 space-y-2 text-sm">
                    {/* Client Name */}
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground min-w-[100px]">Клиент:</span>
                      <span className="font-medium break-all">{getClientName()}</span>
                    </div>
                    
                    {/* Wallet Address (for receiving crypto) */}
                    {order.wallet_address && (
                      <div className="flex items-start gap-2">
                        <span className="text-muted-foreground min-w-[100px]">Реквизиты:</span>
                        <span className="font-mono text-xs break-all">{order.wallet_address}</span>
                      </div>
                    )}
                    
                    {/* Contact Info */}
                    {order.contact_info && (
                      <div className="flex items-start gap-2">
                        <span className="text-muted-foreground min-w-[100px]">Контакт:</span>
                        <span className="break-all">{order.contact_info}</span>
                      </div>
                    )}

                    {/* User Comment */}
                    {(() => {
                      const userNotes = parseUserNotes(order.notes);
                      if (!userNotes) return null;
                      return (
                        <div className="flex items-start gap-2">
                          <span className="text-muted-foreground min-w-[100px]">Комментарий:</span>
                          <span className="break-all">{userNotes}</span>
                        </div>
                      );
                    })()}
                    
                    {/* Payment wallet from notes (for sell orders — legacy) */}
                    {(() => {
                      const paymentInfo = parsePaymentInfo(order.notes);
                      const paymentData = parsePaymentData(order.notes);
                      // Only show legacy wallet if there's no new payment data
                      if (!paymentData && paymentInfo?.wallet_address) {
                        return (
                          <div className="flex items-start gap-2">
                            <span className="text-muted-foreground min-w-[100px]">Кошелёк оплаты:</span>
                            <span className="font-mono text-xs break-all">
                              {paymentInfo.wallet_address}
                              {paymentInfo.network && (
                                <span className="text-muted-foreground ml-1">({paymentInfo.network})</span>
                              )}
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  {/* Payment Instructions for awaiting_payment */}
                  {(() => {
                    if (order.status !== 'awaiting_payment') return null;
                    const paymentData = parsePaymentData(order.notes);
                    if (!paymentData) {
                      // No payment data — show standalone confirm button
                      return (
                        <div className="mt-3">
                          <Button
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleConfirmPayment(order.id)}
                            disabled={confirmPayment.isPending}
                          >
                            {confirmPayment.isPending ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                            )}
                            Я оплатил
                          </Button>
                        </div>
                      );
                    }
                    // Client-side expiry fallback
                    if (paymentData.expires_at && new Date(paymentData.expires_at) < new Date()) {
                      return null;
                    }
                    return (
                      <PaymentInstructions
                        payment={paymentData}
                        orderId={order.id}
                        onConfirmPayment={handleConfirmPayment}
                        isConfirming={confirmPayment.isPending}
                      />
                    );
                  })()}
                </div>

                {/* Action Footer - only show preview for completed orders */}
                {order.status === 'completed' && (
                  <div className="border-t border-border/50 bg-muted/30 px-5 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full hover:bg-background"
                      onClick={() => handlePreviewPDF(order)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Просмотреть документ
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* PDF Preview Modal */}
      <PDFPreviewModal
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        orderData={previewOrder}
        company={company}
        isAdmin={false}
      />
    </div>
  );
});
OrderHistory.displayName = "OrderHistory";

export default OrderHistory;
