import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface EmailStepProps {
  email: string;
  setEmail: (email: string) => void;
  error?: string;
  isLoading: boolean;
  onContinue: () => void;
}

export const EmailStep = ({ email, setEmail, error, isLoading, onContinue }: EmailStepProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Email</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10 h-12 bg-secondary/50 border-border/50"
            onKeyDown={(e) => e.key === 'Enter' && onContinue()}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <Button
        type="button"
        variant="gradient"
        className="w-full h-12"
        disabled={isLoading}
        onClick={onContinue}
      >
        Продолжить
      </Button>
    </div>
  );
};
