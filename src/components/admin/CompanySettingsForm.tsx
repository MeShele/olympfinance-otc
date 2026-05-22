import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Building2, AlertTriangle, Upload, Image, Palette, Check } from "lucide-react";
import { useCompanySettings, useSaveCompanySettings, CompanySettings } from "@/hooks/useCompanySettings";
import MultiLineField from "./MultiLineField";
import WalletField, { WalletEntry, emptyWallet } from "./WalletField";
import { useOperatorId } from "@/hooks/useOperatorId";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { themePresets, themePresetIds, type ThemePreset } from "@/constants/themePresets";
import { hslStringToHex } from "@/contexts/BrandingContext";

const defaultSettings: Omit<CompanySettings, "id"> = {
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
  wallets: "",
  founders: "",
  beneficiaries: "",
  branches: "",
  subsidiaries: "",
  charter_capital: 0,
  operator_wallet_address: "",
  fee_percent: 2.5,
  liquidity_provider_name: "",
  liquidity_provider_inn: "",
  liquidity_provider_residency: "резидент КР",
  liquidity_provider_wallet: "",
  acquiring_enabled: false,
  manual_wallet_address: "",
  sumsub_enabled: false,
  logo_url: "",
  tagline: "",
  primary_color: "",
  accent_color: "",
  social_telegram: "",
  social_twitter: "",
  social_instagram: "",
  logo_dark_url: "",
  favicon_url: "",
  theme_preset: "classic",
  background_color: null,
  card_color: null,
  border_radius: null,
};

async function uploadBrandingFile(file: File, filename: string): Promise<string | null> {
  const ext = file.name.split(".").pop();
  const path = `${filename}.${ext}`;

  toast.info("Загрузка...", { id: "upload-progress" });

  const { error } = await supabase.storage.from("branding").upload(path, file, {
    upsert: true,
    cacheControl: "0",
  });

  if (error) {
    toast.error("Ошибка загрузки", { id: "upload-progress", description: error.message });
    return null;
  }

  const { data: urlData } = supabase.storage.from("branding").getPublicUrl(path);
  toast.success("Файл загружен", { id: "upload-progress" });
  return `${urlData.publicUrl}?v=${Date.now()}`;
}

const parseLines = (value: string): string[] => {
  const parsed = value ? value.split("\n").filter(Boolean) : [];
  return parsed.length > 0 ? parsed : [""];
};

const joinLines = (values: string[]): string => values.filter(Boolean).join("\n");

const parseWallets = (value: string): WalletEntry[] => {
  if (!value) return [{ ...emptyWallet }];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // fallback for legacy plain-text format
  }
  return [{ ...emptyWallet }];
};

const serializeWallets = (wallets: WalletEntry[]): string => {
  const filled = wallets.filter((w) => w.number || w.currency || w.system || w.bank);
  return filled.length > 0 ? JSON.stringify(filled) : "";
};

const CompanySettingsForm = () => {
  const operatorId = useOperatorId();
  const { data: settings, isLoading } = useCompanySettings(operatorId);
  const { mutate: save, isPending: isSaving } = useSaveCompanySettings();
  const [form, setForm] = useState<Omit<CompanySettings, "id">>(defaultSettings);

  const [bankDetails, setBankDetails] = useState<string[]>([""]);
  const [foreignAccounts, setForeignAccounts] = useState<string[]>([""]);
  const [operatorWallets, setOperatorWallets] = useState<string[]>([""]);
  const [eWallets, setEWallets] = useState<WalletEntry[]>([{ ...emptyWallet }]);
  const [showWalletWarning, setShowWalletWarning] = useState(false);
  const initialWalletCount = useRef(0);

  useEffect(() => {
    if (settings) {
      const { id, ...rest } = settings;
      setForm(rest);
      setBankDetails(parseLines(rest.bank_details));
      setForeignAccounts(parseLines(rest.foreign_accounts));
      const parsedWallets = parseLines(rest.operator_wallet_address);
      setOperatorWallets(parsedWallets);
      initialWalletCount.current = parsedWallets.filter(Boolean).length;
      setEWallets(parseWallets(rest.wallets));
      setShowWalletWarning(false);
    }
  }, [settings]);

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleWalletsChange = (values: string[]) => {
    setOperatorWallets(values);
    setShowWalletWarning(values.filter(Boolean).length > initialWalletCount.current);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    save({
      settings: {
        ...form,
        bank_details: joinLines(bankDetails),
        foreign_accounts: joinLines(foreignAccounts),
        operator_wallet_address: joinLines(operatorWallets),
        wallets: serializeWallets(eWallets),
      },
      operatorId,
    });
    initialWalletCount.current = operatorWallets.filter(Boolean).length;
    setShowWalletWarning(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  type SettingsField = Omit<CompanySettings, "id">;
  const fields: { key: keyof SettingsField; label: string; type?: "text" | "textarea" | "number"; placeholder?: string }[] = [
    { key: "company_name", label: "Наименование компании", placeholder: 'ОсОО ФЦ «Аскоинвест»' },
    { key: "legal_address", label: "Юридический адрес", placeholder: "КР, г. Бишкек, ..." },
    { key: "inn", label: "ИНН", placeholder: "02910202510270" },
    { key: "okpo", label: "ОКПО", placeholder: "34337969" },
    { key: "license_number", label: "Номер лицензии", placeholder: "№ 0001 от 01.01.2025" },
    { key: "license_date", label: "Дата лицензии", placeholder: "01.01.2025" },
    { key: "tax_office", label: "Управление ГНС", placeholder: "Управление ГНС по Октябрьскому р-ну" },
    { key: "phone", label: "Телефон", placeholder: "+996 ..." },
    { key: "email", label: "Email", placeholder: "info@olympfinance.kg" },
    { key: "website", label: "Веб-сайт", placeholder: "olympfinance.kg" },
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
    { key: "fee_percent", label: "Комиссия за обмен (%)", type: "number", placeholder: "2.5" },
    { key: "liquidity_provider_name", label: "Поставщик ликвидности (название)", placeholder: "ОсОО «Ликвид»" },
    { key: "liquidity_provider_inn", label: "Поставщик ликвидности (ИНН)", placeholder: "01234567890123" },
    { key: "liquidity_provider_residency", label: "Резидентство поставщика ликвидности", placeholder: "резидент КР" },
    { key: "liquidity_provider_wallet", label: "Кошелёк поставщика ликвидности", placeholder: "T..." },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold">Реквизиты компании</h3>
      </div>

      {/* Theme Preset Section */}
      <div className="p-4 rounded-xl bg-secondary/50 border border-border/50 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Palette className="w-5 h-5 text-violet-400" />
          <h4 className="font-semibold">Тема оформления</h4>
        </div>
        <p className="text-sm text-muted-foreground">
          Выберите визуальную тему для вашего обменника. Тема определяет цвета, шрифты и стиль интерфейса.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {themePresetIds.map((presetId) => {
            const preset = themePresets[presetId];
            const isSelected = form.theme_preset === presetId || (!form.theme_preset && presetId === "classic");
            const darkColors = preset.colors.dark;
            const swatchColors = [
              darkColors.primary,
              darkColors.accent,
              darkColors.background,
              darkColors.card,
            ];
            return (
              <button
                key={presetId}
                type="button"
                onClick={() => handleChange("theme_preset", presetId)}
                className={`relative p-4 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border/50 hover:border-border"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
                <div className="font-medium mb-1">{preset.name}</div>
                <div className="text-xs text-muted-foreground mb-3">{preset.description}</div>
                <div className="flex gap-1.5">
                  {swatchColors.map((color, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full border border-border/30"
                      style={{ backgroundColor: `hsl(${color.split(" / ")[0]})` }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Branding Section */}
      <div className="p-4 rounded-xl bg-secondary/50 border border-border/50 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Image className="w-5 h-5 text-purple-400" />
          <h4 className="font-semibold">Брендинг</h4>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Logo light */}
          <div>
            <Label className="text-sm font-medium">Логотип (светлая тема)</Label>
            {form.logo_url && (
              <img src={form.logo_url} alt="Logo" className="h-10 mt-2 mb-2 rounded bg-white p-1" />
            )}
            <label className="mt-1 flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Upload className="w-4 h-4" />
              Загрузить
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = await uploadBrandingFile(file, "logo-light");
                  if (url) handleChange("logo_url", url);
                }}
              />
            </label>
          </div>

          {/* Logo dark */}
          <div>
            <Label className="text-sm font-medium">Логотип (тёмная тема)</Label>
            {form.logo_dark_url && (
              <img src={form.logo_dark_url} alt="Logo dark" className="h-10 mt-2 mb-2 rounded bg-gray-900 p-1" />
            )}
            <label className="mt-1 flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Upload className="w-4 h-4" />
              Загрузить
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = await uploadBrandingFile(file, "logo-dark");
                  if (url) handleChange("logo_dark_url", url);
                }}
              />
            </label>
          </div>

          {/* Favicon */}
          <div>
            <Label className="text-sm font-medium">Фавикон</Label>
            {form.favicon_url && (
              <img src={form.favicon_url} alt="Favicon" className="h-8 w-8 mt-2 mb-2 rounded" />
            )}
            <label className="mt-1 flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Upload className="w-4 h-4" />
              Загрузить
              <input
                type="file"
                accept=".ico,.png,.svg,image/x-icon,image/png,image/svg+xml"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = await uploadBrandingFile(file, "favicon");
                  if (url) handleChange("favicon_url", url);
                }}
              />
            </label>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Эти данные используются для автоматического заполнения отчётов Финнадзора и сопроводительного письма.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(({ key, label, type = "text", placeholder }) => (
          <div key={key} className={type === "textarea" ? "sm:col-span-2" : ""}>
            <Label htmlFor={key} className="text-sm font-medium">
              {label}
            </Label>
            {type === "textarea" ? (
              <Textarea
                id={key}
                value={String(form[key] ?? "")}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={placeholder}
                rows={2}
                className="mt-1"
              />
            ) : (
              <Input
                id={key}
                type={type}
                value={String(form[key] ?? "")}
                onChange={(e) =>
                  handleChange(key, type === "number" ? Number(e.target.value) : e.target.value)
                }
                placeholder={placeholder}
                className="mt-1"
              />
            )}
          </div>
        ))}
      </div>

      {/* Dynamic multi-line fields */}
      <MultiLineField
        label="Банковские реквизиты"
        values={bankDetails}
        onChange={setBankDetails}
        placeholder="Банк, р/с, БИК —"
      />

      <MultiLineField
        label="Счета за границей"
        values={foreignAccounts}
        onChange={setForeignAccounts}
        placeholder="Счёт"
      />

      <WalletField
        label="Электронные кошельки оператора"
        values={eWallets}
        onChange={setEWallets}
      />

      <MultiLineField
        label="Адреса кошельков оператора ВА (для отчётов)"
        values={operatorWallets}
        onChange={handleWalletsChange}
        placeholder="Адрес кошелька"
        warning={
          showWalletWarning ? (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">
                Вы добавили новый кошелёк. Не забудьте уведомить Госфин (Финнадзор) об изменении реквизитов оператора виртуальных активов.
              </p>
            </div>
          ) : null
        }
      />

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
  );
};

export default CompanySettingsForm;
