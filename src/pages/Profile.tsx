import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useKYC } from "@/hooks/useKYC";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  User, 
  Mail, 
  Shield, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Loader2 
} from "lucide-react";
import { useState } from "react";
import KYCProvider from "@/components/kyc/KYCProvider";

const Profile = () => {
  const { user } = useAuth();
  const { isVerified, kycStatus, isLoading } = useKYC();
  const [showKYCModal, setShowKYCModal] = useState(false);

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || "U";

  const getKYCStatusConfig = () => {
    if (isLoading) {
      return { 
        label: "Проверка...", 
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        color: "bg-muted text-muted-foreground"
      };
    }

    const status = kycStatus?.status;
    
    switch (status) {
      case 'approved':
        return { 
          label: "Верифицирован", 
          icon: <CheckCircle2 className="w-4 h-4" />,
          color: "bg-green-500/10 text-green-500 border-green-500/20"
        };
      case 'pending':
      case 'in_progress':
        return { 
          label: "На проверке", 
          icon: <Clock className="w-4 h-4" />,
          color: "bg-amber-500/10 text-amber-500 border-amber-500/20"
        };
      case 'rejected':
        return { 
          label: "Отклонён", 
          icon: <XCircle className="w-4 h-4" />,
          color: "bg-destructive/10 text-destructive border-destructive/20"
        };
      default:
        return { 
          label: "Не пройден", 
          icon: <Shield className="w-4 h-4" />,
          color: "bg-muted text-muted-foreground border-border"
        };
    }
  };

  const kycConfig = getKYCStatusConfig();

  return (
    <DashboardLayout 
      title="Профиль" 
      description="Управление вашим аккаунтом"
    >
      <div className="max-w-2xl space-y-6">
        {/* User Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Информация о пользователе
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{user?.email}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Аккаунт создан: {new Date(user?.created_at || '').toLocaleDateString('ru-RU')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KYC Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Верификация (KYC)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isVerified ? 'bg-green-500/10' : 'bg-muted'}`}>
                  {isVerified ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : (
                    <Shield className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <Badge 
                    variant="outline" 
                    className={`flex items-center gap-1.5 ${kycConfig.color}`}
                  >
                    {kycConfig.icon}
                    {kycConfig.label}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isVerified 
                      ? "Вы можете совершать обмены без ограничений" 
                      : "Пройдите верификацию для доступа к обмену"
                    }
                  </p>
                </div>
              </div>
              {!isVerified && kycStatus?.status !== 'pending' && kycStatus?.status !== 'in_progress' && (
                <Button 
                  variant="gradient" 
                  onClick={() => setShowKYCModal(true)}
                >
                  Пройти верификацию
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Security Info */}
        <Card className="border-dashed">
          <CardContent className="py-6">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">
                Для изменения email или пароля обратитесь в службу поддержки
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <KYCProvider
        open={showKYCModal}
        onOpenChange={setShowKYCModal}
      />
    </DashboardLayout>
  );
};

export default Profile;
