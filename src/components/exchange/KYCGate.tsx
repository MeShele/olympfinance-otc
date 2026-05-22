import { Shield } from "lucide-react";

interface KYCGateProps {
  kycPendingReview: boolean;
  kycRejected: boolean;
  needsKYC: boolean;
  onOpenKYC: () => void;
}

const KYCGate = ({ kycPendingReview, kycRejected, needsKYC, onOpenKYC }: KYCGateProps) => {
  if (!needsKYC) return null;

  if (kycPendingReview) {
    return (
      <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-500">Заявка на проверке</p>
            <p className="text-xs text-muted-foreground">Ваши данные проверяются администратором. Мы уведомим вас о результате.</p>
          </div>
        </div>
      </div>
    );
  }

  if (kycRejected) {
    return (
      <div
        className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 cursor-pointer hover:bg-destructive/15 transition-colors"
        onClick={onOpenKYC}
      >
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-destructive flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">Верификация отклонена</p>
            <p className="text-xs text-muted-foreground">Нажмите, чтобы пройти KYC повторно</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 cursor-pointer hover:bg-amber-500/15 transition-colors"
      onClick={onOpenKYC}
    >
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-500">Требуется верификация</p>
          <p className="text-xs text-muted-foreground">Пройдите KYC для совершения обмена</p>
        </div>
      </div>
    </div>
  );
};

export default KYCGate;
