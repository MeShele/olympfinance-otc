import { useState } from "react";
import {
  Loader2, Upload, XCircle, Shield,
  FileText, AlertTriangle, ScanFace,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/edgeInvoke";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface OlympFinanceKYCProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (result?: { pendingReview?: boolean }) => void;
}

type Step = "intro" | "personal" | "document" | "selfie" | "processing" | "result";

const DOC_TYPES = [
  { value: "PASSPORT", label: "Паспорт" },
  { value: "ID_CARD", label: "ID-карта" },
  { value: "DRIVER_LICENSE", label: "Водительское удостоверение" },
];

const COUNTRIES = [
  { value: "KGZ", label: "Кыргызстан" },
  { value: "KAZ", label: "Казахстан" },
  { value: "RUS", label: "Россия" },
  { value: "UZB", label: "Узбекистан" },
  { value: "TJK", label: "Таджикистан" },
];

/**
 * OTC-KYC: упрощённый flow без liveness/camera. Клиент загружает фото
 * документа + селфи как обычные file inputs, оператор проверяет вручную
 * в /admin/compliance. Liveness и face-match не валидируются автоматически —
 * это работа оператора.
 */
export default function OlympFinanceKYC({ open, onOpenChange, onComplete }: OlympFinanceKYCProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("intro");

  // Personal data
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [docType, setDocType] = useState("PASSPORT");
  const [docCountry, setDocCountry] = useState("KGZ");
  const [docNumber, setDocNumber] = useState("");

  // Files
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);

  const [processing, setProcessing] = useState(false);

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setPreview: (p: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Файл слишком большой (макс. 10MB)");
      return;
    }
    setFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!user || !documentFile || !selfieFile) return;
    setProcessing(true);
    setStep("processing");

    try {
      await invokeEdgeFunction("asystem-kyc", { action: "init" });

      const docPath = `${user.id}/document_${Date.now()}.jpg`;
      const { error: docUpErr } = await supabase.storage
        .from("kyc-documents")
        .upload(docPath, documentFile, { contentType: documentFile.type });
      if (docUpErr) throw new Error("Ошибка загрузки документа");

      const selfiePath = `${user.id}/selfie_${Date.now()}.jpg`;
      const { error: selfieUpErr } = await supabase.storage
        .from("kyc-documents")
        .upload(selfiePath, selfieFile, { contentType: selfieFile.type });
      if (selfieUpErr) throw new Error("Ошибка загрузки селфи");

      const result = await invokeEdgeFunction<{ decision: string; pending_review: boolean }>(
        "asystem-kyc",
        {
          action: "verify",
          document_type: docType,
          document_country: docCountry,
          document_number: docNumber,
          document_url: docPath,
          selfie_url: selfiePath,
          full_name: fullName,
          phone,
          date_of_birth: dob,
          // liveness_passed: не валидируем автоматически — оператор смотрит
          // глазами при ручной проверке в /admin/compliance.
          liveness_passed: null,
          ocr_data: {
            full_name: fullName,
            document_number: docNumber,
            country: docCountry,
            date_of_birth: dob,
          },
        },
      );

      void result;
      setStep("result");
      onComplete?.({ pendingReview: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка верификации");
      setStep("selfie");
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setStep("intro");
    setFullName("");
    setPhone("");
    setDob("");
    setDocNumber("");
    setDocumentFile(null);
    setDocumentPreview(null);
    setSelfieFile(null);
    setSelfiePreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            KYC Верификация
          </DialogTitle>
        </DialogHeader>

        {step === "intro" && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
              <h3 className="font-semibold text-sm mb-2">Для работы с обменником нужна верификация</h3>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>1. Заполните личные данные</li>
                <li>2. Загрузите фото документа</li>
                <li>3. Загрузите селфи с документом в руках</li>
                <li>4. Дождитесь проверки оператором (до 24 часов)</li>
              </ul>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Ваши данные защищены и обрабатываются в соответствии с законодательством КР.
            </p>
            <Button onClick={() => setStep("personal")} className="w-full">
              Начать верификацию
            </Button>
          </div>
        )}

        {step === "personal" && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">ФИО (как в документе)</label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Иванов Иван Иванович" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Телефон</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+996 700 123456" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Дата рождения</label>
                <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Тип документа</label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Страна</label>
                <Select value={docCountry} onValueChange={setDocCountry}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Номер документа</label>
              <Input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} placeholder="AN1234567" />
            </div>
            <Button
              onClick={() => setStep("document")}
              disabled={!fullName || fullName.length < 3 || !docNumber || docNumber.length < 4}
              className="w-full"
            >
              Далее
            </Button>
          </div>
        )}

        {step === "document" && (
          <div className="space-y-4">
            <div className="text-center">
              <FileText className="w-10 h-10 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Фото документа</h3>
              <p className="text-xs text-muted-foreground">Загрузите чёткое фото разворота документа</p>
            </div>

            {documentPreview ? (
              <div className="relative">
                <img src={documentPreview} alt="Документ" className="w-full rounded-lg border" />
                <button
                  onClick={() => { setDocumentFile(null); setDocumentPreview(null); }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Нажмите для загрузки</span>
                <span className="text-[10px] text-muted-foreground mt-1">JPG, PNG до 10MB</span>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileSelect(e, setDocumentFile, setDocumentPreview)} />
              </label>
            )}

            <Button onClick={() => setStep("selfie")} disabled={!documentFile} className="w-full">
              Далее — Селфи
            </Button>
          </div>
        )}

        {step === "selfie" && (
          <div className="space-y-4">
            <div className="text-center">
              <ScanFace className="w-10 h-10 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Селфи с документом</h3>
              <p className="text-xs text-muted-foreground">
                Сделайте фото где видно ваше лицо и документ в руке. Это нужно
                чтобы оператор подтвердил что документ принадлежит вам.
              </p>
            </div>

            {selfiePreview ? (
              <div className="relative">
                <img src={selfiePreview} alt="Селфи" className="w-full rounded-lg border" />
                <button
                  onClick={() => { setSelfieFile(null); setSelfiePreview(null); }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Загрузить селфи</span>
                <span className="text-[10px] text-muted-foreground mt-1">Селфи с документом в руках, JPG/PNG до 10MB</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  capture="user"
                  onChange={(e) => handleFileSelect(e, setSelfieFile, setSelfiePreview)}
                />
              </label>
            )}

            <Button
              onClick={handleSubmit}
              disabled={!selfieFile || processing}
              className="w-full gap-2"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              Отправить на верификацию
            </Button>
          </div>
        )}

        {step === "processing" && (
          <div className="text-center py-8 space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <div>
              <h3 className="font-semibold">Загружаем документы...</h3>
              <p className="text-xs text-muted-foreground mt-1">Передаём оператору на проверку</p>
            </div>
          </div>
        )}

        {step === "result" && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-amber-400">Заявка отправлена</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Ваши документы переданы на проверку. Оператор обработает заявку и пришлёт результат на email.
              </p>
              <p className="text-xs text-muted-foreground mt-3">Обычно проверка занимает до 24 часов.</p>
            </div>

            <Button onClick={() => onOpenChange(false)} className="w-full" variant="outline">
              Закрыть
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
