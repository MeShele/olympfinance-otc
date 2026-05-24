import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { z } from 'zod';
import { EmailStep } from '@/components/auth/EmailStep';
import { PasswordStep } from '@/components/auth/PasswordStep';
import { OTPStep } from '@/components/auth/OTPStep';
import ResidencyChoice from '@/components/auth/ResidencyChoice';
import RelationshipPurposeChoice, { type RelationshipPurpose } from '@/components/auth/RelationshipPurposeChoice';
import { useBrandingContext, useThemeLogo } from '@/contexts/BrandingContext';
import { translateAuthError } from '@/lib/authErrors';
import { supabase } from '@/integrations/supabase/client';

const emailSchema = z.string().email('Введите корректный email');
const passwordSchema = z.string().min(6, 'Пароль должен содержать минимум 6 символов');

type AuthStep = 'email' | 'password' | 'otp' | 'residency' | 'purpose';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string; otp?: string }>({});

  const { signIn, signUp, verifyOtp, resendOtp, user, loading } = useAuth();
  const navigate = useNavigate();
  const branding = useBrandingContext();
  const logoUrl = useThemeLogo();

  useEffect(() => {
    if (!loading && user && step !== 'residency' && step !== 'purpose') {
      navigate('/');
    }
  }, [user, loading, navigate, step]);

  const validateEmail = () => {
    try {
      emailSchema.parse(email);
      setErrors(prev => ({ ...prev, email: undefined }));
      return true;
    } catch (e) {
      if (e instanceof z.ZodError) {
        setErrors(prev => ({ ...prev, email: e.errors[0].message }));
      }
      return false;
    }
  };

  const validatePassword = () => {
    const newErrors: { password?: string; confirmPassword?: string } = {};

    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }

    if (!isLogin && password !== confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают';
    }

    setErrors(prev => ({ ...prev, ...newErrors }));
    return !newErrors.password && !newErrors.confirmPassword;
  };

  const handleEmailContinue = () => {
    if (validateEmail()) {
      setStep('password');
    }
  };

  const handlePasswordSubmit = async () => {
    if (!validatePassword()) return;

    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error('Ошибка входа', { description: translateAuthError(error) });
        } else {
          toast.success('Успешный вход', { description: `Добро пожаловать в ${branding.company_name}!` });
          navigate('/');
        }
      } else {
        // Registration
        const { error, data } = await signUp(email, password);
        if (error) {
          toast.error('Ошибка регистрации', { description: translateAuthError(error) });
        } else if (data?.session) {
          // Auto-confirmed — user is already logged in. Don't navigate yet;
          // the useEffect-on-user will kick in but we override via step.
          setStep('residency');
        } else {
          // Email confirmation required — show confirmation message
          toast.success('Подтвердите email', { description: 'Мы отправили ссылку для подтверждения на вашу почту. Перейдите по ней для завершения регистрации.' });
          setStep('email');
          setIsLogin(true);
        }
      }
    } catch (error) {
      toast.error('Ошибка', { description: 'Произошла непредвиденная ошибка' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = useCallback(async () => {
    if (otpCode.length < 6) return;

    setIsLoading(true);
    setErrors(prev => ({ ...prev, otp: undefined }));

    try {
      const { error } = await verifyOtp(email, otpCode, 'signup');
      if (error) {
        setErrors(prev => ({ ...prev, otp: translateAuthError(error) }));
      } else {
        setStep('residency');
      }
    } catch (error) {
      toast.error('Ошибка', { description: 'Произошла непредвиденная ошибка' });
    } finally {
      setIsLoading(false);
    }
  }, [email, otpCode, verifyOtp, navigate, branding.company_name]);

  const handleResendOtp = async () => {
    setIsLoading(true);
    try {
      const { error } = await resendOtp(email);
      if (error) {
        toast.error('Ошибка', { description: translateAuthError(error) });
      } else {
        toast.success('Код отправлен', { description: 'Новый код подтверждения отправлен на вашу почту' });
        setOtpCode('');
        setErrors(prev => ({ ...prev, otp: undefined }));
      }
    } catch (error) {
      toast.error('Ошибка', { description: 'Не удалось отправить код' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResidencySubmit = async (isResident: boolean) => {
    setIsLoading(true);
    try {
      if (!user) {
        navigate('/');
        return;
      }
      const { error } = await supabase
        .from('profiles')
        .update({ is_resident: isResident })
        .eq('user_id', user.id);
      if (error) {
        toast.error('Не удалось сохранить', { description: error.message });
        return;
      }
      // Переходим к следующему шагу — цель деловых отношений
      setStep('purpose');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurposeSubmit = async (purpose: RelationshipPurpose) => {
    setIsLoading(true);
    try {
      if (!user) {
        navigate('/');
        return;
      }
      const { error } = await supabase
        .from('profiles')
        .update({ relationship_purpose: purpose })
        .eq('user_id', user.id);
      if (error) {
        toast.error('Не удалось сохранить', { description: error.message });
        return;
      }
      toast.success('Регистрация завершена', { description: `Добро пожаловать в ${branding.company_name}!` });
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeSwitch = () => {
    setIsLogin(!isLogin);
    setStep('email');
    setPassword('');
    setConfirmPassword('');
    setOtpCode('');
    setErrors({});
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background FX (dark only) */}
      <div className="hidden dark:block absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:60px_60px] opacity-[0.05]" />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          На главную
        </Button>

        {/* Auth Card */}
        <div className="glass-panel rounded-2xl p-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <img src={logoUrl} alt={branding.company_name} className="h-14 w-auto" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-center mb-2">
            {step === 'otp'
              ? 'Подтверждение email'
              : step === 'residency'
                ? 'Резидентство'
                : step === 'purpose'
                  ? 'Цель использования'
                  : isLogin
                    ? 'Вход в аккаунт'
                    : 'Создание аккаунта'}
          </h1>
          <p className="text-muted-foreground text-center mb-8">
            {step === 'email' && (isLogin ? 'Введите email для входа' : 'Введите email для регистрации')}
            {step === 'password' && (isLogin ? 'Введите пароль' : 'Создайте пароль')}
            {step === 'otp' && 'Введите код из письма'}
            {step === 'residency' && 'Резидентство для отчётности ГСФР'}
            {step === 'purpose' && 'Зачем вам обменник?'}
          </p>

          {/* Form Steps */}
          <form onSubmit={(e) => e.preventDefault()}>
            {step === 'email' && (
              <EmailStep
                email={email}
                setEmail={setEmail}
                error={errors.email}
                isLoading={isLoading}
                onContinue={handleEmailContinue}
              />
            )}

            {step === 'password' && (
              <PasswordStep
                password={password}
                setPassword={setPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                passwordError={errors.password}
                confirmPasswordError={errors.confirmPassword}
                isLoading={isLoading}
                isLogin={isLogin}
                onSubmit={handlePasswordSubmit}
                onBack={() => setStep('email')}
              />
            )}

            {step === 'otp' && (
              <OTPStep
                email={email}
                otpCode={otpCode}
                setOtpCode={setOtpCode}
                error={errors.otp}
                isLoading={isLoading}
                onVerify={handleVerifyOtp}
                onResend={handleResendOtp}
                onBack={() => {
                  setStep('email');
                  setOtpCode('');
                  setErrors(prev => ({ ...prev, otp: undefined }));
                }}
              />
            )}

            {step === 'residency' && (
              <ResidencyChoice
                onSubmit={handleResidencySubmit}
                isLoading={isLoading}
              />
            )}

            {step === 'purpose' && (
              <RelationshipPurposeChoice
                onSubmit={handlePurposeSubmit}
                isLoading={isLoading}
              />
            )}
          </form>

          {/* Toggle (only on email step) */}
          {step === 'email' && (
            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
                <button
                  type="button"
                  onClick={handleModeSwitch}
                  className="ml-2 text-primary hover:underline font-medium"
                >
                  {isLogin ? 'Зарегистрироваться' : 'Войти'}
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Trust Indicators */}
        <div className="mt-6 flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Lock className="w-4 h-4" />
            SSL защита
          </span>
          <span>&bull;</span>
          <span>256-bit шифрование</span>
        </div>
      </div>
    </div>
  );
};

export default Auth;
