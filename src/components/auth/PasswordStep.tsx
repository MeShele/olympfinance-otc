import { Eye, EyeOff, Lock, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PasswordStepProps {
  password: string;
  setPassword: (password: string) => void;
  confirmPassword?: string;
  setConfirmPassword?: (password: string) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  passwordError?: string;
  confirmPasswordError?: string;
  isLoading: boolean;
  isLogin: boolean;
  onSubmit: () => void;
  onBack: () => void;
}

export const PasswordStep = ({
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  passwordError,
  confirmPasswordError,
  isLoading,
  isLogin,
  onSubmit,
  onBack,
}: PasswordStepProps) => {
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Назад
      </button>

      <div className="space-y-2">
        <label className="text-sm font-medium">Пароль</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10 pr-10 h-12 bg-secondary/50 border-border/50"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
      </div>

      {!isLogin && setConfirmPassword && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Подтвердите пароль</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-12 bg-secondary/50 border-border/50"
            />
          </div>
          {confirmPasswordError && <p className="text-sm text-destructive">{confirmPasswordError}</p>}
        </div>
      )}

      <Button
        type="button"
        variant="gradient"
        className="w-full h-12"
        disabled={isLoading}
        onClick={onSubmit}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {isLogin ? 'Вход...' : 'Регистрация...'}
          </>
        ) : (
          isLogin ? 'Войти' : 'Зарегистрироваться'
        )}
      </Button>
    </div>
  );
};
