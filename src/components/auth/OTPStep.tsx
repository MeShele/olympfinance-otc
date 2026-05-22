import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface OTPStepProps {
  email: string;
  otpCode: string;
  setOtpCode: (code: string) => void;
  error?: string;
  isLoading: boolean;
  onVerify: () => void;
  onResend: () => void;
  onBack: () => void;
}

export const OTPStep = ({
  email,
  otpCode,
  setOtpCode,
  error,
  isLoading,
  onVerify,
  onResend,
  onBack,
}: OTPStepProps) => {
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleResend = () => {
    onResend();
    setCountdown(60);
    setCanResend(false);
  };

  // Auto-verify when 6 digits are entered
  useEffect(() => {
    if (otpCode.length === 6 && !isLoading) {
      onVerify();
    }
  }, [otpCode, isLoading, onVerify]);

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Изменить email
      </button>

      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Мы отправили код подтверждения на
        </p>
        <p className="font-medium">{email}</p>
      </div>

      <div className="flex justify-center">
        <InputOTP
          maxLength={6}
          value={otpCode}
          onChange={setOtpCode}
          disabled={isLoading}
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      <Button
        type="button"
        variant="gradient"
        className="w-full h-12"
        disabled={isLoading || otpCode.length < 6}
        onClick={onVerify}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Проверка...
          </>
        ) : (
          'Подтвердить'
        )}
      </Button>

      <div className="text-center">
        {canResend ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResend}
            className="text-primary"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Отправить код повторно
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            Отправить повторно через {countdown} сек
          </p>
        )}
      </div>
    </div>
  );
};
