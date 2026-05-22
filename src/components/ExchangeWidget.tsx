import { useState, useMemo, useCallback, useEffect } from "react";
import { ArrowDownUp, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrencies, Currency } from "@/hooks/useCurrencies";
import { useAuth } from "@/hooks/useAuth";
import { useKYC } from "@/hooks/useKYC";
import { useUserRole } from "@/hooks/useUserRole";
import { useCreateOrder } from "@/hooks/useCreateOrder";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { usePairRatesForCalculator, computeExchangeRate } from "@/hooks/useCurrencyPairRates";
import { parseNetworkWallets } from "@/components/admin/NetworkWalletField";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import OlympFinanceKYC from "@/components/kyc/OlympFinanceKYC";
import PublicOfferModal, { isOfferAccepted } from "@/components/order/PublicOfferModal";
import OrderFormModal from "@/components/order/OrderFormModal";
import DirectionTabs from "@/components/exchange/DirectionTabs";
import AmountInput from "@/components/exchange/AmountInput";
import RateInfo from "@/components/exchange/RateInfo";
import KYCGate from "@/components/exchange/KYCGate";
import { toast } from "sonner";
// OTC build doesn't ship the platform license guard — orders are always
// allowed. The hook used to gate behind a self-host license heartbeat;
// here it's a constant.
const useCanCreateOrder = () => true;
import { useCoreRates } from "@/hooks/useCoreRates";

type ExchangeDirection = "buy" | "sell" | "swap";

const DEFAULT_FEE_PERCENT = 2.5;

const ExchangeWidget = () => {
  const { data: rawCurrencies = [], isLoading } = useCurrencies();
  const { data: companySettings, isLoading: settingsLoading } = useCompanySettings();
  const pairRates = usePairRatesForCalculator();
  const { user } = useAuth();
  const { isVerified, kycStatus, isLoading: kycLoading } = useKYC();
  const { data: userRole } = useUserRole();


  const isStaff = userRole === "admin" || userRole === "operator_admin" || userRole === "staff";
  const canCreateOrder = useCanCreateOrder();
  const { data: coreRates } = useCoreRates();

  // Override crypto rates with live data from core API (Binance)
  const currencies = useMemo(() => {
    if (!coreRates?.crypto) return rawCurrencies;
    return rawCurrencies.map(c => {
      if (c.type === "crypto" && coreRates.crypto[c.code]) {
        return { ...c, rate_to_usd: coreRates.crypto[c.code] };
      }
      return c;
    });
  }, [rawCurrencies, coreRates]);

  const [direction, setDirection] = useState<ExchangeDirection>("buy");
  const [fromCurrencyCode, setFromCurrencyCode] = useState<string>("USD");
  const [toCurrencyCode, setToCurrencyCode] = useState<string>("BTC");
  const [fromAmount, setFromAmount] = useState("1000");
  const [toAmount, setToAmount] = useState("");
  const [showKYCModal, setShowKYCModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [kycJustSubmitted, setKycJustSubmitted] = useState(false);

  const createOrderMutation = useCreateOrder();

  // Admin-configured wallet networks (only those with both network code and address)
  const adminWalletNetworks = useMemo(() => {
    if (!companySettings?.manual_wallet_address) return new Set<string>();
    const wallets = parseNetworkWallets(companySettings.manual_wallet_address);
    return new Set(
      wallets
        .filter(w => w.network && w.address)
        .map(w => w.network.toUpperCase())
    );
  }, [companySettings?.manual_wallet_address]);

  // Admin wallets with full data (for inline display in SELL/SWAP)
  const adminWallets = useMemo(() => {
    if (!companySettings?.manual_wallet_address) return [];
    return parseNetworkWallets(companySettings.manual_wallet_address)
      .filter(w => w.network && w.address);
  }, [companySettings?.manual_wallet_address]);

  // While settings are loading, don't filter (avoid empty flash)
  const settingsReady = !settingsLoading;

  // Check if a crypto currency has at least one network supported by admin wallets
  const hasSupportedNetworks = useCallback((currency: Currency): boolean => {
    if (currency.type !== 'crypto') return true;
    if (!settingsReady) return true;
    // No wallets configured — show all crypto (admin will configure wallets later)
    if (adminWallets.length === 0 && adminWalletNetworks.size === 0) return true;
    // If admin has wallets but without network specified — show all crypto
    if (adminWalletNetworks.size === 0 && adminWallets.length > 0) return true;
    const networks = currency.networks || [];
    if (networks.length === 0) return adminWallets.length > 0;
    return networks.some(n => adminWalletNetworks.has(n.toUpperCase()));
  }, [adminWalletNetworks, adminWallets, settingsReady]);

  // Filter currency networks to only those with admin wallet configured
  const filterNetworksByWallets = useCallback((networks?: string[]): string[] => {
    if (!networks || networks.length === 0) return [];
    if (!settingsReady) return networks;
    if (adminWalletNetworks.size === 0) return [];
    return networks.filter(n => adminWalletNetworks.has(n.toUpperCase()));
  }, [adminWalletNetworks, settingsReady]);

  // Get currency objects (safe fallback for empty currencies)
  const fromCurrency = useMemo(() =>
    currencies.length > 0 ? (currencies.find(c => c.code === fromCurrencyCode) || currencies[0]) : null,
    [currencies, fromCurrencyCode]
  );

  const toCurrency = useMemo(() =>
    currencies.length > 0 ? (currencies.find(c => c.code === toCurrencyCode) || currencies.find(c => c.type === "crypto") || null) : null,
    [currencies, toCurrencyCode]
  );

  // Filter currencies based on direction + hide crypto without admin-supported networks
  const filteredFromCurrencies = useMemo(() => {
    if (direction === "buy") {
      return currencies.filter(c => c.type === "fiat");
    } else if (direction === "sell") {
      return currencies.filter(c => c.type === "crypto" && hasSupportedNetworks(c));
    } else {
      return currencies.filter(c => c.type === "crypto" && hasSupportedNetworks(c));
    }
  }, [currencies, direction, hasSupportedNetworks]);

  const filteredToCurrencies = useMemo(() => {
    if (direction === "buy") {
      return currencies.filter(c => c.type === "crypto" && hasSupportedNetworks(c));
    } else if (direction === "sell") {
      return currencies.filter(c => c.type === "fiat");
    } else {
      return currencies.filter(c => c.type === "crypto" && c.code !== fromCurrencyCode && hasSupportedNetworks(c));
    }
  }, [currencies, direction, fromCurrencyCode, hasSupportedNetworks]);

  // Auto-correct selected currencies when filtered lists change
  useEffect(() => {
    if (filteredFromCurrencies.length > 0 && !filteredFromCurrencies.some(c => c.code === fromCurrencyCode)) {
      setFromCurrencyCode(filteredFromCurrencies[0].code);
    }
  }, [filteredFromCurrencies]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (filteredToCurrencies.length > 0 && !filteredToCurrencies.some(c => c.code === toCurrencyCode)) {
      setToCurrencyCode(filteredToCurrencies[0].code);
    }
  }, [filteredToCurrencies]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fee from company settings (single source of truth)
  const feePercent = useMemo(() => {
    return companySettings?.fee_percent ?? DEFAULT_FEE_PERCENT;
  }, [companySettings]);

  // Calculate exchange rate via pair rates (direct rate or fallback to cross-rate)
  const exchangeRate = useMemo(() => {
    return computeExchangeRate(direction, fromCurrency, toCurrency, pairRates);
  }, [direction, fromCurrency, toCurrency, pairRates]);

  /**
   * Format a number for an amount input WITHOUT triggering scientific
   * notation. Node / V8's `Number.toString()` switches to `1.42e-7` for
   * magnitudes below 1e-6; the input's sanitize-regex (`[^0-9.,]/g`)
   * then strips the `e-`, turning "1.42e-7" into "1.427" and letting the
   * user accidentally submit a buy for 1.4 BTC when they meant
   * 0.00000014 BTC. This helper keeps everything decimal.
   */
  const formatAmount = (n: number, isCrypto: boolean): string => {
    if (!isFinite(n) || n <= 0) return "";
    // maximumFractionDigits caps at 20 per spec; 18 leaves some safety margin
    return n.toLocaleString("en-US", {
      useGrouping: false,
      maximumFractionDigits: isCrypto ? 18 : 8,
      minimumFractionDigits: 0,
    });
  };

  // Calculate "to" amount from "from" amount
  const calculateToAmount = useCallback((fromValue: string) => {
    const inputAmount = parseFloat(fromValue) || 0;
    if (inputAmount === 0) return "";
    const feeInFrom = inputAmount * (feePercent / 100);
    const amountAfterFee = inputAmount - feeInFrom;
    const received = amountAfterFee * exchangeRate;
    return formatAmount(received, toCurrency?.type === "crypto");
  }, [exchangeRate, feePercent, toCurrency]);

  // Calculate "from" amount from "to" amount
  const calculateFromAmount = useCallback((toValue: string) => {
    const outputAmount = parseFloat(toValue) || 0;
    if (outputAmount === 0 || exchangeRate === 0) return "";
    const feeFactor = 1 - feePercent / 100;
    if (feeFactor <= 0) return "";
    const fromBeforeFee = outputAmount / exchangeRate;
    const fromWithFee = fromBeforeFee / feeFactor;
    return formatAmount(fromWithFee, fromCurrency?.type === "crypto");
  }, [exchangeRate, feePercent, fromCurrency]);

  // Handle from amount change
  const handleFromAmountChange = useCallback((value: string) => {
    const cleanValue = value.replace(/[^0-9.,]/g, '').replace(',', '.');
    setFromAmount(cleanValue);
    setToAmount(calculateToAmount(cleanValue));
  }, [calculateToAmount]);

  // Handle to amount change
  const handleToAmountChange = useCallback((value: string) => {
    const cleanValue = value.replace(/[^0-9.,]/g, '').replace(',', '.');
    setToAmount(cleanValue);
    setFromAmount(calculateFromAmount(cleanValue));
  }, [calculateFromAmount]);

  // Recalculate when exchange rate changes
  useEffect(() => {
    if (fromAmount) {
      setToAmount(calculateToAmount(fromAmount));
    }
  }, [exchangeRate, feePercent, fromAmount, calculateToAmount]);

  // Fee calculation
  const feeInFromCurrency = useMemo(() => {
    const inputAmount = parseFloat(fromAmount) || 0;
    return inputAmount * (feePercent / 100);
  }, [fromAmount, feePercent]);

  // Validation
  const validation = useMemo(() => {
    if (!fromCurrency) return { valid: false, message: "" };

    const inputAmount = parseFloat(fromAmount) || 0;

    if (inputAmount === 0) {
      return { valid: false, message: "" };
    }

    if (inputAmount < fromCurrency.min_amount) {
      return {
        valid: false,
        message: `Минимум: ${fromCurrency.min_amount.toLocaleString()} ${fromCurrency.code}`
      };
    }

    if (inputAmount > fromCurrency.max_amount) {
      return {
        valid: false,
        message: `Максимум: ${fromCurrency.max_amount.toLocaleString()} ${fromCurrency.code}`
      };
    }

    return { valid: true, message: "" };
  }, [fromAmount, fromCurrency]);

  const handleSwapCurrencies = useCallback(() => {
    const temp = fromCurrencyCode;
    setFromCurrencyCode(toCurrencyCode);
    setToCurrencyCode(temp);
  }, [fromCurrencyCode, toCurrencyCode]);

  const handleDirectionChange = useCallback((newDirection: ExchangeDirection) => {
    if (newDirection === direction) return;

    setDirection(newDirection);
    setFromAmount("");
    setToAmount("");

    const fiats = currencies.filter(c => c.type === "fiat");
    const cryptos = currencies.filter(c => c.type === "crypto" && hasSupportedNetworks(c));

    if (newDirection === "buy") {
      if (fiats.length > 0) setFromCurrencyCode(fiats[0].code);
      if (cryptos.length > 0) setToCurrencyCode(cryptos[0].code);
    } else if (newDirection === "sell") {
      if (cryptos.length > 0) setFromCurrencyCode(cryptos[0].code);
      if (fiats.length > 0) setToCurrencyCode(fiats[0].code);
    } else {
      if (cryptos.length >= 2) {
        setFromCurrencyCode(cryptos[0].code);
        setToCurrencyCode(cryptos[1].code);
      }
    }
  }, [direction, currencies, hasSupportedNetworks]);

  const getDirectionLabel = () => {
    switch (direction) {
      case "buy": return "Купить";
      case "sell": return "Продать";
      case "swap": return "Обменять";
    }
  };

  const handleExchange = () => {
    if (!user) {
      window.location.href = '/auth';
      return;
    }

    if (!canCreateOrder) {
      toast.error('Обменник ожидает подтверждения', { description: 'Администратор проверит вашу заявку и активирует обменник' });
      return;
    }

    if (isStaff) {
      toast.error('Сотрудникам недоступен обмен', { description: 'Функции обмена доступны только клиентам' });
      return;
    }

    if (kycPendingReview) {
      toast.info('Ваша заявка на верификацию ещё проверяется');
      return;
    }

    if (!isVerified) {
      setShowKYCModal(true);
      return;
    }

    if (isOfferAccepted(user?.id)) {
      setShowOrderModal(true);
      return;
    }

    setShowOfferModal(true);
  };

  const handleOfferAccepted = () => {
    setShowOrderModal(true);
  };

  const handleOrderSubmit = async (walletAddress: string, contactInfo: string, notes?: string, network?: string) => {
    const fromValue = parseFloat(fromAmount) || 0;
    const toValue = parseFloat(toAmount) || 0;

    // Validate order through core API (no personal data sent)
    try {
      const { validateOrder } = await import("@/lib/core-api");
      const validation = await validateOrder({
        from_currency: fromCurrencyCode,
        to_currency: toCurrencyCode,
        amount: fromValue,
        direction,
      });
      if (validation.data && !validation.data.valid) {
        toast.error(validation.data.message || "Заявка не прошла валидацию");
        return;
      }
    } catch {
      // Core API unreachable — allow order (graceful degradation)
      console.warn("Core API unreachable, skipping validation");
    }

    const cryptoCurrency = direction === 'buy' ? toCurrency : fromCurrency;
    const cryptoRateToUsd = cryptoCurrency?.type === 'crypto' ? cryptoCurrency.rate_to_usd : undefined;

    const result = await createOrderMutation.mutateAsync({
      fromAmount: fromValue,
      fromCurrency: fromCurrencyCode,
      toAmount: toValue,
      toCurrency: toCurrencyCode,
      rate: exchangeRate,
      walletAddress,
      contactInfo,
      notes,
      direction,
      feePercent,
      network: network || fromCurrency?.network || toCurrency?.network || null,
      cryptoRateToUsd,
    });

    if (result?.paymentInfo) {
      setFromAmount("");
      setToAmount("");
      return result;
    }

    toast.success('Заявка успешно создана!');

    setFromAmount("");
    setToAmount("");
    return result;
  };

  // Reset kycJustSubmitted once React Query catches up
  useEffect(() => {
    if (kycJustSubmitted && (kycStatus?.status === 'pending' || kycStatus?.status === 'in_progress')) {
      setKycJustSubmitted(false);
    }
  }, [kycStatus?.status, kycJustSubmitted]);

  const kycPendingReview = user && !isVerified && !kycLoading && (kycStatus?.status === 'pending' || kycStatus?.status === 'in_progress' || kycJustSubmitted);
  const kycRejected = user && !isVerified && !kycLoading && kycStatus?.status === 'rejected';
  const needsKYC = user && !isVerified && !kycLoading;

  if (isLoading) {
    return (
      <div className="glass-panel rounded-[32px] p-1.5 w-full max-w-md mx-auto">
        <div className="bg-card rounded-[28px] p-6 sm:p-8 flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (currencies.length === 0 || !fromCurrency || !toCurrency) {
    return (
      <div className="glass-panel rounded-[32px] p-1.5 w-full max-w-md mx-auto">
        <div className="bg-card rounded-[28px] p-6 sm:p-8 flex flex-col items-center justify-center min-h-[400px] gap-3 text-muted-foreground">
          <p className="text-sm">Валюты не настроены</p>
          <p className="text-xs">Администратор должен добавить валюты в панели управления.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-[32px] p-1.5 w-full max-w-md mx-auto animate-scale-in"><div className="bg-card rounded-[28px] p-6 sm:p-8">
      {/* Direction Toggle */}
      <DirectionTabs direction={direction} onChange={handleDirectionChange} />

      {/* From Input */}
      <div className="mb-4">
        <AmountInput
          label="Вы отдаёте"
          amount={fromAmount}
          onAmountChange={handleFromAmountChange}
          currencies={filteredFromCurrencies}
          selectedCode={fromCurrencyCode}
          onCurrencyChange={setFromCurrencyCode}
          validation={validation}
          showRange
          currency={fromCurrency}
        />
      </div>

      {/* Swap Button */}
      <div className="flex justify-center -my-2 relative z-10">
        <button
          onClick={handleSwapCurrencies}
          className="bg-brand-gradient text-white p-3 rounded-xl shadow-lg hover:shadow-brand transition-all hover:scale-105 active:scale-95"
        >
          <ArrowDownUp className="w-5 h-5" />
        </button>
      </div>

      {/* To Input */}
      <div className="mt-4 mb-6">
        <AmountInput
          label="Вы получаете"
          amount={toAmount}
          onAmountChange={handleToAmountChange}
          currencies={filteredToCurrencies}
          selectedCode={toCurrencyCode}
          onCurrencyChange={setToCurrencyCode}
        />
      </div>

      {/* Rate Info */}
      <RateInfo
        fromCurrency={fromCurrency}
        toCurrency={toCurrency}
        exchangeRate={exchangeRate}
        feePercent={feePercent}
        feeAmount={feeInFromCurrency}
        showFee={validation.valid && parseFloat(fromAmount) > 0}
      />

      {/* KYC Banner */}
      <KYCGate
        kycPendingReview={!!kycPendingReview}
        kycRejected={!!kycRejected}
        needsKYC={!!needsKYC}
        onOpenKYC={() => setShowKYCModal(true)}
      />

      {/* CTA Button */}
      <Button
        variant="gradient"
        size="lg"
        className="w-full"
        disabled={!validation.valid || !parseFloat(fromAmount) || !!kycPendingReview || isStaff}
        onClick={handleExchange}
      >
        {!user ? 'Войти для обмена' : isStaff ? (
          <>
            <Shield className="w-4 h-4 mr-2" />
            Обмен недоступен для сотрудников
          </>
        ) : kycPendingReview ? (
          <>
            <Shield className="w-4 h-4 mr-2" />
            Заявка на проверке...
          </>
        ) : needsKYC ? (
          <>
            <Shield className="w-4 h-4 mr-2" />
            Пройти верификацию
          </>
        ) : (
          `${getDirectionLabel()} ${toCurrency?.code}`
        )}
      </Button>

      {/* Trust indicators */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          Мгновенный обмен
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-primary" />
          Безопасно
        </span>
      </div>

      {/* KYC Modal */}
      <OlympFinanceKYC
        open={showKYCModal}
        onOpenChange={setShowKYCModal}
        onComplete={(result) => {
          if (result?.pendingReview) {
            setKycJustSubmitted(true);
          } else {
            setShowOfferModal(true);
          }
        }}
      />

      {/* Public Offer Modal */}
      <PublicOfferModal
        open={showOfferModal}
        onOpenChange={setShowOfferModal}
        onAccept={handleOfferAccepted}
        userId={user?.id}
      />

      {/* Order Form Modal */}
      {fromCurrency && toCurrency && (
        <OrderFormModal
          open={showOrderModal}
          onOpenChange={setShowOrderModal}
          orderData={{
            fromAmount: parseFloat(fromAmount) || 0,
            fromCurrency: fromCurrencyCode,
            fromCurrencyIcon: fromCurrency.icon,
            toAmount: parseFloat(toAmount) || 0,
            toCurrency: toCurrencyCode,
            toCurrencyIcon: toCurrency.icon,
            rate: exchangeRate,
            direction,
            network: (() => {
              const rawNetworks = direction === 'buy' || direction === 'swap'
                ? toCurrency?.networks : fromCurrency?.networks;
              const filtered = filterNetworksByWallets(rawNetworks);
              return filtered.length > 0 ? filtered[0] : null;
            })(),
            networks: filterNetworksByWallets(
              direction === 'buy' || direction === 'swap'
                ? toCurrency?.networks
                : fromCurrency?.networks
            ),
            fromNetworks: direction === 'swap'
              ? filterNetworksByWallets(fromCurrency?.networks)
              : undefined,
          }}
          onSubmit={handleOrderSubmit}
          adminWallets={adminWallets}
          bankAccounts={direction === 'buy' ? fromCurrency?.bank_accounts : undefined}
        />
      )}
    </div></div>
  );
};

export default ExchangeWidget;
