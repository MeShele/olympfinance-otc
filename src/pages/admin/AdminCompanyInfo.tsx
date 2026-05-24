import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Building2, CreditCard, Palette, Upload, Image, GraduationCap } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { hslStringToHex } from "@/contexts/BrandingContext";
import { useCompanySettings, useSaveCompanySettings, CompanySettings } from "@/hooks/useCompanySettings";
import NetworkWalletField, { NetworkWallet, emptyNetworkWallet, parseNetworkWallets, serializeNetworkWallets } from "@/components/admin/NetworkWalletField";
import { useOperatorId } from "@/hooks/useOperatorId";
import LiquidityProvidersSection from "@/components/admin/LiquidityProvidersSection";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { toast as sonnerToast } from "sonner";

async function uploadBrandingFile(file: File, filename: string): Promise<string | null> {
  const ext = file.name.split(".").pop();
  const path = `${filename}.${ext}`;

  sonnerToast.info("Загрузка...", { id: "upload-progress" });

  const { error } = await supabase.storage.from("branding").upload(path, file, {
    upsert: true,
    cacheControl: "0",
  });

  if (error) {
    sonnerToast.error("Ошибка загрузки", { id: "upload-progress", description: error.message });
    return null;
  }

  const { data: urlData } = supabase.storage.from("branding").getPublicUrl(path);
  const url = `${urlData.publicUrl}?v=${Date.now()}`;
  sonnerToast.success("Файл загружен", { id: "upload-progress" });
  return url;
}

const defaultSettings: Omit<CompanySettings, "id" | "fee_percent"> = {
  company_name: "",
  legal_address: "",
  inn: "",
  okpo: "",
  license_number: "",
  license_date: "",
  tax_office: "",
  phone: "",
  email: "",
  website: "",
  director_name: "",
  director_short: "",
  director_phone: "",
  accountant_name: "",
  accountant_phone: "",
  bank_details: "",
  foreign_accounts: "",
  founders: "",
  beneficiaries: "",
  branches: "",
  subsidiaries: "",
  charter_capital: 0,
  liquidity_provider_name: "",
  liquidity_provider_inn: "",
  liquidity_provider_residency: "резидент КР",
  liquidity_provider_wallet: "",
  manual_wallet_address: "",
  quiz_enabled: true,
  logo_url: "",
  tagline: "",
  primary_color: "#06b6d4",
  accent_color: "#3b82f6",
  social_telegram: "",
  social_twitter: "",
  social_instagram: "",
  logo_dark_url: "",
  favicon_url: "",
};

const fields: { key: string; label: string; type?: "text" | "textarea" | "number"; placeholder?: string }[] = [
  { key: "company_name", label: "Наименование компании", placeholder: 'ОсОО ФЦ «Аскоинвест»' },
  { key: "legal_address", label: "Юридический адрес", placeholder: "КР, г. Бишкек, ..." },
  { key: "inn", label: "ИНН", placeholder: "02910202510270" },
  { key: "okpo", label: "ОКПО", placeholder: "34337969" },
  { key: "license_number", label: "Номер лицензии", placeholder: "№ 0001 от 01.01.2025" },
  { key: "license_date", label: "Дата лицензии", placeholder: "01.01.2025" },
  { key: "tax_office", label: "Управление ГНС", placeholder: "Управление ГНС по Октябрьскому р-ну" },
  { key: "phone", label: "Телефон", placeholder: "+996 ..." },
  { key: "email", label: "Email", placeholder: "info@fiatex.kg" },
  { key: "website", label: "Веб-сайт", placeholder: "fiatex.kg" },
  { key: "director_name", label: "ФИО руководителя (полное)", placeholder: "Иванов Иван Иванович" },
  { key: "director_short", label: "ФИО руководителя (сокр.)", placeholder: "Иванов И.И." },
  { key: "director_phone", label: "Телефон руководителя", placeholder: "+996 ..." },
  { key: "accountant_name", label: "Главный бухгалтер (ФИО)", placeholder: "Петрова А.В." },
  { key: "accountant_phone", label: "Телефон бухгалтера", placeholder: "+996 ..." },
  { key: "founders", label: "Учредители", type: "textarea", placeholder: "ФИО, доля" },
  { key: "beneficiaries", label: "Бенефициары", type: "textarea", placeholder: "ФИО" },
  { key: "branches", label: "Филиалы", type: "textarea", placeholder: "Нет / адреса" },
  { key: "subsidiaries", label: "Дочерние организации", type: "textarea", placeholder: "Нет / названия" },
  { key: "charter_capital", label: "Уставный капитал (сом)", type: "number", placeholder: "0" },
];

export default function AdminCompanyInfo() {
  const operatorId = useOperatorId();
  const { data: settings, isLoading } = useCompanySettings(operatorId);
  const { mutateAsync: saveAsync, isPending: isSaving } = useSaveCompanySettings();
  const [form, setForm] = useState<Record<string, any>>(defaultSettings);

  const [manualWallets, setManualWallets] = useState<NetworkWallet[]>([{ ...emptyNetworkWallet }]);

  useEffect(() => {
    if (settings) {
      const { id, fee_percent, ...rest } = settings;
      setForm(rest);
      setManualWallets(parseNetworkWallets(rest.manual_wallet_address));
    }
  }, [settings]);

  const handleChange = (field: string, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Auto-save after logo/favicon upload so user doesn't need to press "Save"
  const handleLogoUpload = (field: string) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const slug = field === "logo_url" ? "logo-light" : field === "logo_dark_url" ? "logo-dark" : "favicon";
    const url = await uploadBrandingFile(file, slug);
    if (!url) return;
    const updatedForm = { ...form, [field]: url };
    setForm(updatedForm);
    try {
      await saveAsync({
        settings: {
          ...updatedForm,
          manual_wallet_address: serializeNetworkWallets(manualWallets),
        },
        operatorId,
      });
    } catch (err: any) {
      toast.error("Ошибка сохранения", { description: err.message });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveAsync({
      settings: {
        ...form,
        manual_wallet_address: serializeNetworkWallets(manualWallets),
      },
      operatorId,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <RequirePermission section="company">
    <div className="max-w-3xl">
          <div className="admin-card">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Реквизиты компании</h3>
                  <p className="text-sm text-muted-foreground">Данные для отчётов</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {fields.map(({ key, label, type = "text", placeholder }) => (
                  <div key={`${key}-${label}`} className={type === "textarea" ? "sm:col-span-2" : ""}>
                    <Label htmlFor={key} className="text-sm font-medium">{label}</Label>
                    {type === "textarea" ? (
                      <Textarea
                        id={key}
                        value={form[key] || ""}
                        onChange={(e) => handleChange(key, e.target.value)}
                        placeholder={placeholder}
                        rows={2}
                        className="mt-1"
                      />
                    ) : (
                      <Input
                        id={key}
                        type={type}
                        value={form[key] ?? ""}
                        onChange={(e) => handleChange(key, type === "number" ? Number(e.target.value) : e.target.value)}
                        placeholder={placeholder}
                        className="mt-1"
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Branding Settings */}
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <Image className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Брендинг</h3>
                    <p className="text-sm text-muted-foreground">Логотипы, цвета и соцсети</p>
                  </div>
                </div>

                {/* Logo uploads */}
                <div className="grid gap-4 sm:grid-cols-3">
                  {/* Logo light */}
                  <div className="p-4 rounded-xl bg-muted/50 border border-border">
                    <Label className="text-sm font-medium text-foreground">Логотип (светлая тема)</Label>
                    {form.logo_url && (
                      <img src={form.logo_url} alt="Logo" className="h-10 mt-2 mb-2 rounded bg-white p-1" />
                    )}
                    <label className="mt-2 flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <Upload className="w-4 h-4" />
                      Загрузить
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload("logo_url")}
                      />
                    </label>
                  </div>

                  {/* Logo dark */}
                  <div className="p-4 rounded-xl bg-muted/50 border border-border">
                    <Label className="text-sm font-medium text-foreground">Логотип (тёмная тема)</Label>
                    {form.logo_dark_url && (
                      <img src={form.logo_dark_url as string} alt="Logo dark" className="h-10 mt-2 mb-2 rounded bg-gray-900 p-1" />
                    )}
                    <label className="mt-2 flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <Upload className="w-4 h-4" />
                      Загрузить
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload("logo_dark_url")}
                      />
                    </label>
                  </div>

                  {/* Favicon */}
                  <div className="p-4 rounded-xl bg-muted/50 border border-border">
                    <Label className="text-sm font-medium text-foreground">Фавикон</Label>
                    {form.favicon_url && (
                      <img src={form.favicon_url as string} alt="Favicon" className="h-8 w-8 mt-2 mb-2 rounded" />
                    )}
                    <label className="mt-2 flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <Upload className="w-4 h-4" />
                      Загрузить
                      <input
                        type="file"
                        accept=".ico,.png,.svg,image/x-icon,image/png,image/svg+xml"
                        className="hidden"
                        onChange={handleLogoUpload("favicon_url")}
                      />
                    </label>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="tagline" className="text-sm font-medium">Слоган</Label>
                    <Input
                      id="tagline"
                      value={form.tagline || ""}
                      onChange={(e) => handleChange("tagline", e.target.value)}
                      placeholder="Быстрый и надёжный обмен криптовалют"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Основной цвет</Label>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <input
                          type="color"
                          value={hslStringToHex(form.primary_color || "")}
                          onChange={(e) => handleChange("primary_color", e.target.value)}
                          className="w-12 h-12 rounded-xl border-2 border-border cursor-pointer bg-transparent p-0.5 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch]:border-0"
                          title="Выберите цвет пипеткой"
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          id="primary_color"
                          value={form.primary_color?.startsWith("#") ? form.primary_color : hslStringToHex(form.primary_color || "")}
                          onChange={(e) => handleChange("primary_color", e.target.value)}
                          placeholder="#06b6d4"
                          className="font-mono"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Кнопки, ссылки, акценты</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Дополнительный цвет</Label>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <input
                          type="color"
                          value={hslStringToHex(form.accent_color || "")}
                          onChange={(e) => handleChange("accent_color", e.target.value)}
                          className="w-12 h-12 rounded-xl border-2 border-border cursor-pointer bg-transparent p-0.5 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch]:border-0"
                          title="Выберите цвет пипеткой"
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          id="accent_color"
                          value={form.accent_color?.startsWith("#") ? form.accent_color : hslStringToHex(form.accent_color || "")}
                          onChange={(e) => handleChange("accent_color", e.target.value)}
                          placeholder="#3b82f6"
                          className="font-mono"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Градиенты, hover-эффекты</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Фон</Label>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <input
                          type="color"
                          value={hslStringToHex(form.background_color || "")}
                          onChange={(e) => handleChange("background_color", e.target.value)}
                          className="w-12 h-12 rounded-xl border-2 border-border cursor-pointer bg-transparent p-0.5 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch]:border-0"
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          value={form.background_color?.startsWith("#") ? form.background_color : hslStringToHex(form.background_color || "")}
                          onChange={(e) => handleChange("background_color", e.target.value)}
                          placeholder="#09090b"
                          className="font-mono"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Основной фон страницы</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Карточки</Label>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <input
                          type="color"
                          value={hslStringToHex(form.card_color || "")}
                          onChange={(e) => handleChange("card_color", e.target.value)}
                          className="w-12 h-12 rounded-xl border-2 border-border cursor-pointer bg-transparent p-0.5 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch]:border-0"
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          value={form.card_color?.startsWith("#") ? form.card_color : hslStringToHex(form.card_color || "")}
                          onChange={(e) => handleChange("card_color", e.target.value)}
                          placeholder="#0a0a0a"
                          className="font-mono"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Виджет обмена, блоки</p>
                      </div>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-sm font-medium mb-2 block">Скругление углов</Label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max="24"
                        step="2"
                        value={parseInt(form.border_radius || "12")}
                        onChange={(e) => handleChange("border_radius", e.target.value)}
                        className="flex-1 accent-primary"
                      />
                      <span className="text-sm font-mono text-muted-foreground w-12 text-right">{form.border_radius || "12"}px</span>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleChange("primary_color", "#06b6d4");
                        handleChange("accent_color", "#3b82f6");
                        handleChange("background_color", "");
                        handleChange("card_color", "");
                        handleChange("border_radius", "12");
                      }}
                    >
                      <Palette className="w-4 h-4 mr-2" />
                      Сбросить всё по умолчанию
                    </Button>
                  </div>
                  <div>
                    <Label htmlFor="social_telegram" className="text-sm font-medium">Telegram</Label>
                    <Input
                      id="social_telegram"
                      value={form.social_telegram || ""}
                      onChange={(e) => handleChange("social_telegram", e.target.value)}
                      placeholder="https://t.me/..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="social_twitter" className="text-sm font-medium">Twitter / X</Label>
                    <Input
                      id="social_twitter"
                      value={form.social_twitter || ""}
                      onChange={(e) => handleChange("social_twitter", e.target.value)}
                      placeholder="https://x.com/..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="social_instagram" className="text-sm font-medium">Instagram</Label>
                    <Input
                      id="social_instagram"
                      value={form.social_instagram || ""}
                      onChange={(e) => handleChange("social_instagram", e.target.value)}
                      placeholder="https://instagram.com/..."
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Модули */}
              <div className="space-y-4 pt-4 border-t border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Модули</h3>
                    <p className="text-sm text-muted-foreground">Включаемые функции обменника</p>
                  </div>
                </div>

                <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-muted/40 border border-border">
                  <div className="flex-1">
                    <Label htmlFor="quiz_enabled" className="text-sm font-medium cursor-pointer">
                      Тест знаний перед обменом
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Клиент проходит короткий тест (4 вопроса о крипте) перед первой сделкой.
                      Рекомендуется для соответствия требованиям ГСФР КР. Вопросы редактируются в{" "}
                      <a href="/admin/quiz" className="text-primary hover:underline">/admin/quiz</a>.
                    </p>
                  </div>
                  <Switch
                    id="quiz_enabled"
                    checked={!!form.quiz_enabled}
                    onCheckedChange={(v) => handleChange("quiz_enabled", v)}
                  />
                </div>
              </div>

              {/* Wallet Settings (moved from legacy acquiring section) */}
              <div className="space-y-4 pt-4 border-t border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Кошельки оператора</h3>
                    <p className="text-sm text-muted-foreground">Адреса для приёма криптовалюты</p>
                  </div>
                </div>

                <NetworkWalletField
                  label="Кошельки по сетям"
                  values={manualWallets}
                  onChange={setManualWallets}
                  enableQRUpload={true}
                />
              </div>

              <Button type="submit" variant="gradient" className="w-full" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Сохранить настройки
                  </>
                )}
              </Button>
            </form>

            <div className="mt-8">
              <LiquidityProvidersSection />
            </div>
          </div>
    </div>
    </RequirePermission>
  );
}
