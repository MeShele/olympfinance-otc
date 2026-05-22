import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Loader2, Shield, RefreshCw, Coins, FileText, Banknote, Bitcoin, FileSpreadsheet, Building2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useAllCurrencies } from "@/hooks/useAllCurrencies";
import { useOrders } from "@/hooks/useOrders";
import { Currency } from "@/hooks/useCurrencies";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CurrencyTable from "@/components/admin/CurrencyTable";
import CurrencyForm from "@/components/admin/CurrencyForm";
import OrdersTable from "@/components/admin/OrdersTable";
import ReportGenerator from "@/components/admin/ReportGenerator";
import CompanySettingsForm from "@/components/admin/CompanySettingsForm";
import ComplianceForm from "@/components/admin/ComplianceForm";

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { canAccessAdmin, isLoading: roleLoading } = useIsAdmin();
  const { data: currencies = [], isLoading: currenciesLoading, refetch: refetchCurrencies } = useAllCurrencies();
  const { data: orders = [], isLoading: ordersLoading, refetch: refetchOrders } = useOrders();
  
  const [showForm, setShowForm] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currencyTab, setCurrencyTab] = useState<"fiat" | "crypto">("fiat");

  const fiatCurrencies = currencies.filter(c => c.type === "fiat");
  const cryptoCurrencies = currencies.filter(c => c.type === "crypto");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!roleLoading && user && !canAccessAdmin) {
      toast.error("Доступ запрещён", { description: "У вас нет прав администратора" });
      navigate("/");
    }
  }, [canAccessAdmin, roleLoading, user, navigate]);

  const handleSave = async (data: Partial<Currency>) => {
    setIsSaving(true);
    try {
      if (editingCurrency) {
        const { error } = await supabase
          .from("currencies")
          .update(data as any)
          .eq("id", editingCurrency.id);
        
        if (error) throw error;
        
        toast.success("Успешно", { description: "Валюта обновлена" });
      } else {
        const { error } = await supabase
          .from("currencies")
          .insert(data as any);
        
        if (error) throw error;
        
        toast.success("Успешно", { description: "Валюта добавлена" });
      }
      
      setShowForm(false);
      setEditingCurrency(null);
      refetchCurrencies();
    } catch (error: any) {
      toast.error("Ошибка", { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (currency: Currency) => {
    if (!confirm(`Удалить валюту ${currency.code}?`)) return;
    
    try {
      const { error } = await supabase
        .from("currencies")
        .delete()
        .eq("id", currency.id);
      
      if (error) throw error;
      
      toast.success("Успешно", { description: "Валюта удалена" });
      refetchCurrencies();
    } catch (error: any) {
      toast.error("Ошибка", { description: error.message });
    }
  };

  const handleEdit = (currency: Currency) => {
    setEditingCurrency(currency);
    setCurrencyTab(currency.type);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingCurrency(null);
    setShowForm(true);
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !canAccessAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:60px_60px] opacity-[0.05]" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              На главную
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">Админ-панель</h1>
            </div>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid w-full max-w-3xl grid-cols-5">
            <TabsTrigger value="orders" className="gap-2">
              <FileText className="w-4 h-4" />
              Заявки
              {orders.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary">
                  {orders.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Отчёты
            </TabsTrigger>
            <TabsTrigger value="compliance" className="gap-2">
              <ShieldCheck className="w-4 h-4" />
              Комплайнс
            </TabsTrigger>
            <TabsTrigger value="currencies" className="gap-2">
              <Coins className="w-4 h-4" />
              Валюты
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Building2 className="w-4 h-4" />
              Настройки
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <div className="admin-card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Управление заявками</h2>
                <Button variant="outline" onClick={() => refetchOrders()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Обновить
                </Button>
              </div>

              {ordersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <OrdersTable orders={orders} />
              )}
            </div>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <div className="admin-card max-w-xl">
              <ReportGenerator 
                currencies={currencies.map(c => ({ code: c.code, type: c.type, bank_accounts: c.bank_accounts }))}
              />
            </div>
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance">
            <div className="admin-card max-w-3xl">
              <ComplianceForm />
            </div>
          </TabsContent>

          {/* Currencies Tab */}
          <TabsContent value="currencies">
            <div className="admin-card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Управление валютами</h2>
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={() => refetchCurrencies()}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Обновить
                  </Button>
                  <Button variant="gradient" onClick={handleAdd}>
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить валюту
                  </Button>
                </div>
              </div>

              {showForm && (
                <div className="mb-6">
                  <CurrencyForm
                    currency={editingCurrency}
                    onSave={handleSave}
                    onCancel={() => {
                      setShowForm(false);
                      setEditingCurrency(null);
                    }}
                    isLoading={isSaving}
                  />
                </div>
              )}

              {/* Fiat/Crypto Tabs */}
              <Tabs value={currencyTab} onValueChange={(v) => setCurrencyTab(v as "fiat" | "crypto")}>
                <TabsList className="mb-4">
                  <TabsTrigger value="fiat" className="gap-2">
                    <Banknote className="w-4 h-4" />
                    Фиат ({fiatCurrencies.length})
                  </TabsTrigger>
                  <TabsTrigger value="crypto" className="gap-2">
                    <Bitcoin className="w-4 h-4" />
                    Крипто ({cryptoCurrencies.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="fiat">
                  {currenciesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : fiatCurrencies.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      Нет фиатных валют. Добавьте первую валюту.
                    </div>
                  ) : (
                    <CurrencyTable
                      currencies={fiatCurrencies}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  )}
                </TabsContent>

                <TabsContent value="crypto">
                  {currenciesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : cryptoCurrencies.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      Нет криптовалют. Добавьте первую валюту.
                    </div>
                  ) : (
                    <CurrencyTable
                      currencies={cryptoCurrencies}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="admin-card max-w-3xl">
              <CompanySettingsForm />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
