import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Upload, X, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface NetworkWallet {
  network: string;
  address: string;
  qr_url?: string;
}

export const emptyNetworkWallet: NetworkWallet = { network: "", address: "" };

const NETWORKS = ["TRC20", "ERC20", "BEP20", "Solana", "TON", "Bitcoin", "Arbitrum", "Optimism", "Polygon", "Avalanche"];

export const parseNetworkWallets = (value: string): NetworkWallet[] => {
  if (!value) return [{ ...emptyNetworkWallet }];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].network !== undefined) return parsed;
  } catch {}
  // Legacy: plain newline-separated addresses → convert to objects without network
  const lines = value.split("\n").filter(Boolean);
  if (lines.length > 0) return lines.map((address) => ({ network: "", address }));
  return [{ ...emptyNetworkWallet }];
};

export const serializeNetworkWallets = (wallets: NetworkWallet[]): string => {
  const filled = wallets.filter((w) => w.address);
  return filled.length > 0 ? JSON.stringify(filled) : "";
};

interface NetworkWalletFieldProps {
  label: string;
  values: NetworkWallet[];
  onChange: (values: NetworkWallet[]) => void;
  warning?: React.ReactNode;
  enableQRUpload?: boolean;
}

const NetworkWalletField = ({ label, values, onChange, warning, enableQRUpload }: NetworkWalletFieldProps) => {
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const update = (index: number, field: keyof NetworkWallet, value: string) => {
    const updated = [...values];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const add = () => onChange([...values, { ...emptyNetworkWallet }]);

  const remove = (index: number) => {
    const updated = values.filter((_, i) => i !== index);
    onChange(updated.length > 0 ? updated : [{ ...emptyNetworkWallet }]);
  };

  const handleQRUpload = async (index: number, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Поддерживаются только изображения (JPEG, PNG, WebP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Максимальный размер файла — 5 МБ");
      return;
    }

    setUploadingIndex(index);
    try {
      const ext = file.name.split(".").pop() || "png";
      const filePath = `qr/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-assets")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("payment-assets")
        .getPublicUrl(filePath);

      const updated = [...values];
      updated[index] = { ...updated[index], qr_url: urlData.publicUrl };
      onChange(updated);
      toast.success("QR-код загружен");
    } catch (err: any) {
      console.error("QR upload error:", err);
      toast.error(err?.message || "Ошибка загрузки QR");
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleQRDelete = async (index: number) => {
    const qrUrl = values[index].qr_url;
    if (!qrUrl) return;

    try {
      // Extract path from URL: ...payment-assets/qr/uuid.png
      const match = qrUrl.match(/payment-assets\/(.+)$/);
      if (match) {
        await supabase.storage.from("payment-assets").remove([match[1]]);
      }
    } catch {
      // Ignore delete errors — just clear the URL
    }

    const updated = [...values];
    updated[index] = { ...updated[index], qr_url: undefined };
    onChange(updated);
    toast.success("QR-код удалён");
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{label}</Label>
      {values.map((entry, index) => (
        <div key={index} className="space-y-2">
          <div className="grid grid-cols-[180px_1fr_auto] gap-2 items-end">
            <div>
              {index === 0 && <span className="text-xs text-muted-foreground">Сеть</span>}
              <Select value={entry.network} onValueChange={(v) => update(index, "network", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите сеть" />
                </SelectTrigger>
                <SelectContent>
                  {NETWORKS.map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              {index === 0 && <span className="text-xs text-muted-foreground">Адрес кошелька</span>}
              <Input
                value={entry.address}
                onChange={(e) => update(index, "address", e.target.value)}
                placeholder="0x... / T... / ..."
              />
            </div>
            <div className="flex items-center gap-1">
              {index === 0 && <span className="text-xs text-muted-foreground opacity-0">—</span>}
              {values.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  className="shrink-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* QR Upload */}
          {enableQRUpload && entry.address && (
            <div className="flex items-center gap-2 ml-[180px] pl-2">
              {entry.qr_url ? (
                <>
                  <img
                    src={entry.qr_url}
                    alt="QR"
                    className="w-9 h-9 rounded border border-border object-cover"
                  />
                  <span className="text-xs text-muted-foreground">QR загружен</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleQRDelete(index)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    ref={(el) => { fileInputRefs.current[index] = el; }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleQRUpload(index, file);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    disabled={uploadingIndex === index}
                    onClick={() => fileInputRefs.current[index]?.click()}
                  >
                    {uploadingIndex === index ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Upload className="w-3 h-3" />
                    )}
                    Загрузить QR
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1">
        <Plus className="w-4 h-4" />
        Добавить кошелёк
      </Button>
      {warning}
    </div>
  );
};

export default NetworkWalletField;
