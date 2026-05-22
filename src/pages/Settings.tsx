import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";

const Settings = () => {
  return (
    <DashboardLayout title="Настройки" description="Настройки приложения">
      <div className="max-w-2xl space-y-6">
        <Card className="border-dashed">
          <CardContent className="py-6">
            <div className="text-center text-muted-foreground">
              <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                Дополнительные настройки будут доступны в ближайшее время
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
