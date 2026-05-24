import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/edgeInvoke";
import { Loader2, Users, CheckCircle2, Clock, XCircle, AlertTriangle, ThumbsUp, ThumbsDown, Eye, FileText, Camera } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { RequirePermission } from "@/components/admin/RequirePermission";

interface UserWithKYC {
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  is_verified: boolean;
  created_at: string;
  kyc_status: string | null;
  document_number: string | null;
  document_type: string | null;
  document_country: string | null;
  rejection_reason: string | null;
  kyc_created_at: string | null;
  kyc_updated_at: string | null;
  verified_at: string | null;
  document_url: string | null;
  selfie_url: string | null;
  verification_method: string | null;
  ocr_data: Record<string, any> | null;
  face_match_score: number | null;
  liveness_passed: boolean | null;
  applicant_id: string | null;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  PASSPORT: "Паспорт",
  ID_CARD: "ID карта",
  DRIVER_LICENSE: "Вод. удостоверение",
};

const COUNTRY_LABELS: Record<string, string> = {
  KGZ: "Кыргызстан",
  RUS: "Россия",
  KAZ: "Казахстан",
  TJK: "Таджикистан",
  UZB: "Узбекистан",
  TKM: "Туркменистан",
  CHN: "Китай",
  USA: "США",
  DEU: "Германия",
  TUR: "Турция",
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  approved: { label: "Подтверждён", variant: "default", icon: CheckCircle2 },
  pending: { label: "Ожидает", variant: "secondary", icon: Clock },
  in_progress: { label: "На проверке", variant: "outline", icon: Clock },
  rejected: { label: "Отклонён", variant: "destructive", icon: XCircle },
  expired: { label: "Истёк", variant: "destructive", icon: AlertTriangle },
};

export default function AdminCompliance() {
  const queryClient = useQueryClient();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectUserId, setRejectUserId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [detailUser, setDetailUser] = useState<UserWithKYC | null>(null);
  const [docSignedUrl, setDocSignedUrl] = useState<string | null>(null);
  const [selfieSignedUrl, setSelfieSignedUrl] = useState<string | null>(null);
  const [freshPortraitUrl, setFreshPortraitUrl] = useState<string | null>(null);
  const [freshDocSourceUrl, setFreshDocSourceUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!detailUser) {
      setDocSignedUrl(null);
      setSelfieSignedUrl(null);
      setFreshPortraitUrl(null);
      setFreshDocSourceUrl(null);
      return;
    }

    const loadUrls = async () => {
      // Supabase Storage signed URLs (manual KYC uploads)
      if (detailUser.document_url) {
        const { data } = await supabase.storage
          .from('kyc-documents')
          .createSignedUrl(detailUser.document_url, 300);
        setDocSignedUrl(data?.signedUrl ?? null);
      }
      if (detailUser.selfie_url) {
        const { data } = await supabase.storage
          .from('kyc-documents')
          .createSignedUrl(detailUser.selfie_url, 300);
        setSelfieSignedUrl(data?.signedUrl ?? null);
      }

      // Refresh portrait from KYC provider (Didit/BV S3 URLs expire).
      // Background enrichment — silent on failure, the cached photo still
      // renders.
      if (detailUser.applicant_id && detailUser.verification_method) {
        try {
          const data = await invokeEdgeFunction<{ portrait_url?: string; face_match_source?: string }>(
            'refresh-kyc-portrait',
            { session_id: detailUser.applicant_id, provider: detailUser.verification_method },
          );
          if (data?.portrait_url) {
            setFreshPortraitUrl(data.portrait_url);
          }
          if (data?.face_match_source) {
            setFreshDocSourceUrl(data.face_match_source);
          }
        } catch (err) {
          console.error('Failed to refresh KYC portrait:', err);
        }
      }
    };

    loadUrls();
  }, [detailUser]);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users-kyc"],
    queryFn: async () => {
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, email, full_name, phone, is_verified, created_at")
        .order("created_at", { ascending: false });

      if (pErr) throw pErr;

      const { data: kycs, error: kErr } = await supabase
        .from("kyc_verifications")
        .select("user_id, status, document_number, document_type, document_country, rejection_reason, verified_at, created_at, updated_at, document_url, selfie_url, verification_method, ocr_data, face_match_score, liveness_passed, applicant_id");

      if (kErr) throw kErr;

      const kycMap = new Map(kycs?.map((k) => [k.user_id, k]) ?? []);

      return (profiles ?? []).map((p) => {
        const kyc = kycMap.get(p.user_id);
        return {
          ...p,
          kyc_status: kyc?.status ?? null,
          document_number: kyc?.document_number ?? null,
          document_type: kyc?.document_type ?? null,
          document_country: kyc?.document_country ?? null,
          rejection_reason: kyc?.rejection_reason ?? null,
          kyc_created_at: kyc?.created_at ?? null,
          kyc_updated_at: kyc?.updated_at ?? null,
          verified_at: kyc?.verified_at ?? null,
          document_url: kyc?.document_url ?? null,
          selfie_url: kyc?.selfie_url ?? null,
          verification_method: kyc?.verification_method ?? null,
          ocr_data: kyc?.ocr_data ?? null,
          face_match_score: kyc?.face_match_score ?? null,
          liveness_passed: kyc?.liveness_passed ?? null,
          applicant_id: kyc?.applicant_id ?? null,
        } as UserWithKYC;
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error: kycErr } = await supabase
        .from("kyc_verifications")
        .update({
          status: "approved",
          verified_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .eq("user_id", userId);

      if (kycErr) throw kycErr;

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ is_verified: true })
        .eq("user_id", userId);

      if (profileErr) throw profileErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-kyc"] });
      toast.success("KYC одобрен", { description: "Пользователь верифицирован" });
      setDetailUser(null);
    },
    onError: (error: any) => {
      toast.error("Ошибка", { description: error.message });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const { error: kycErr } = await supabase
        .from("kyc_verifications")
        .update({
          status: "rejected",
          rejection_reason: reason,
        })
        .eq("user_id", userId);

      if (kycErr) throw kycErr;

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ is_verified: false })
        .eq("user_id", userId);

      if (profileErr) throw profileErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-kyc"] });
      toast.success("KYC отклонён", { description: "Заявка отклонена" });
      setRejectDialogOpen(false);
      setRejectUserId(null);
      setRejectionReason("");
      setDetailUser(null);
    },
    onError: (error: any) => {
      toast.error("Ошибка", { description: error.message });
    },
  });

  const handleRejectClick = (userId: string) => {
    setRejectUserId(userId);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (!rejectUserId) return;
    if (!rejectionReason.trim()) {
      toast.error("Укажите причину", { description: "Причина отклонения обязательна" });
      return;
    }
    rejectMutation.mutate({ userId: rejectUserId, reason: rejectionReason.trim() });
  };

  const canReview = (status: string | null) => status === "pending" || status === "in_progress";

  const stats = {
    total: users.length,
    verified: users.filter((u) => u.kyc_status === "approved").length,
    pending: users.filter((u) => u.kyc_status === "pending" || u.kyc_status === "in_progress").length,
    noKyc: users.filter((u) => !u.kyc_status).length,
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      return format(new Date(dateStr), "dd.MM.yyyy HH:mm");
    } catch {
      return "—";
    }
  };

  return (
    <RequirePermission section="compliance">
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">KYC верификация</h1>
        <p className="text-muted-foreground mt-1">Очередь проверок KYC и просмотр документов клиентов</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Всего пользователей" value={stats.total} icon={Users} color="cyan" />
        <StatCard label="KYC пройден" value={stats.verified} icon={CheckCircle2} color="emerald" />
        <StatCard label="Ожидают проверки" value={stats.pending} icon={Clock} color="yellow" />
        <StatCard label="Без KYC" value={stats.noKyc} icon={AlertTriangle} color="slate" />
      </div>

      {/* Users table */}
      <div className="admin-card">
        <h2 className="text-xl font-semibold mb-4 text-foreground">Очередь верификации</h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>ФИО</TableHead>
                  <TableHead>Документ</TableHead>
                  <TableHead>KYC статус</TableHead>
                  <TableHead>Метод</TableHead>
                  <TableHead>Регистрация</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const status = user.kyc_status ? statusConfig[user.kyc_status] : null;
                  return (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>{user.full_name || "—"}</TableCell>
                      <TableCell>
                        {user.document_number ? (
                          <div>
                            <span>{user.document_number}</span>
                            {user.document_type && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({DOCUMENT_TYPE_LABELS[user.document_type] || user.document_type})
                              </span>
                            )}
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {status ? (
                          <div className="space-y-1">
                            <Badge variant={status.variant} className="gap-1">
                              <status.icon className="w-3 h-3" />
                              {status.label}
                            </Badge>
                            {user.kyc_status === "rejected" && user.rejection_reason && (
                              <p className="text-xs text-destructive max-w-[200px] truncate" title={user.rejection_reason}>
                                {user.rejection_reason}
                              </p>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-muted-foreground">
                            Не начат
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {user.verification_method === 'biometric-vision' ? 'BV' :
                         user.verification_method === 'sumsub' ? 'SumSub' :
                         user.verification_method === 'asystem-kyc' ? 'Fiatex' :
                         user.verification_method || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(user.created_at), "dd.MM.yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.kyc_status && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => setDetailUser(user)}
                            >
                              <Eye className="w-3 h-3" />
                              Подробнее
                            </Button>
                          )}
                          {canReview(user.kyc_status) && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                className="gap-1"
                                onClick={() => approveMutation.mutate(user.user_id)}
                                disabled={approveMutation.isPending}
                              >
                                <ThumbsUp className="w-3 h-3" />
                                Одобрить
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="gap-1"
                                onClick={() => handleRejectClick(user.user_id)}
                                disabled={rejectMutation.isPending}
                              >
                                <ThumbsDown className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Нет пользователей
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!detailUser} onOpenChange={(open) => !open && setDetailUser(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Детали KYC верификации</DialogTitle>
            <DialogDescription>
              Полная информация о пользователе и его документах
            </DialogDescription>
          </DialogHeader>

          {detailUser && (
            <div className="space-y-4">
              {/* Status badge */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Статус</span>
                {detailUser.kyc_status && statusConfig[detailUser.kyc_status] ? (
                  <Badge variant={statusConfig[detailUser.kyc_status].variant} className="gap-1">
                    {(() => { const Icon = statusConfig[detailUser.kyc_status!].icon; return <Icon className="w-3 h-3" />; })()}
                    {statusConfig[detailUser.kyc_status].label}
                  </Badge>
                ) : (
                  <Badge variant="outline">Не начат</Badge>
                )}
              </div>

              {/* User info */}
              <div className="space-y-3 p-4 rounded-lg bg-secondary/30 border border-border/50">
                <h4 className="font-medium text-sm">Персональные данные</h4>
                <DetailRow label="Email" value={detailUser.email} />
                <DetailRow label="ФИО" value={detailUser.full_name} />
                <DetailRow label="Телефон" value={detailUser.phone} />
              </div>

              {/* Document info */}
              <div className="space-y-3 p-4 rounded-lg bg-secondary/30 border border-border/50">
                <h4 className="font-medium text-sm">Документ</h4>
                <DetailRow
                  label="Тип документа"
                  value={detailUser.document_type ? (DOCUMENT_TYPE_LABELS[detailUser.document_type] || detailUser.document_type) : null}
                />
                <DetailRow label="Номер документа" value={detailUser.document_number} />
                <DetailRow
                  label="Страна выдачи"
                  value={detailUser.document_country ? (COUNTRY_LABELS[detailUser.document_country] || detailUser.document_country) : null}
                />
              </div>

              {/* KYC Provider verification data (universal for BV, Didit, SumSub, legacy rows) */}
              {(detailUser.verification_method || (detailUser.ocr_data && Object.keys(detailUser.ocr_data).length > 0) || detailUser.applicant_id) && (
                <div className="space-y-3 p-4 rounded-lg bg-secondary/30 border border-border/50">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    Данные верификации
                    <Badge variant="outline" className="text-xs">
                      {(() => {
                        const m = detailUser.verification_method;
                        if (m === 'biometric-vision') return 'Biometric Vision';
                        if (m === 'didit') return 'Didit';
                        if (m === 'sumsub') return 'SumSub';
                        if (m === 'asystem' || m === 'asystem-kyc') return 'Fiatex KYC';
                        if (m) return m;
                        // Legacy rows: infer from ocr_data shape
                        if (detailUser.ocr_data?.bv_status) return 'Biometric Vision';
                        if (detailUser.ocr_data?.didit_status) return 'Didit';
                        if (detailUser.ocr_data?.sumsub_raw) return 'SumSub';
                        return 'KYC Provider';
                      })()}
                    </Badge>
                  </h4>

                  {/* Session / Applicant ID */}
                  {detailUser.applicant_id && (
                    <DetailRow label="Session ID" value={detailUser.applicant_id} />
                  )}

                  {/* BV / Didit Status */}
                  {(detailUser.ocr_data?.bv_status || detailUser.ocr_data?.didit_status) && (
                    <DetailRow label="Статус провайдера" value={detailUser.ocr_data.bv_status || detailUser.ocr_data.didit_status} />
                  )}

                  {/* Full name from OCR / Tunduk */}
                  {detailUser.ocr_data && (detailUser.ocr_data.full_name || detailUser.ocr_data.first_name) && (
                    <DetailRow label="ФИО" value={
                      detailUser.ocr_data.full_name ||
                      [detailUser.ocr_data.last_name, detailUser.ocr_data.first_name, detailUser.ocr_data.patronymic]
                        .filter(Boolean).join(' ')
                    } />
                  )}
                  {detailUser.ocr_data?.personal_number && (
                    <DetailRow label="ИНН / ПИН" value={detailUser.ocr_data.personal_number} />
                  )}
                  {detailUser.ocr_data?.gender && (
                    <DetailRow label="Пол" value={detailUser.ocr_data.gender === 'M' ? 'Мужской' : detailUser.ocr_data.gender === 'F' ? 'Женский' : detailUser.ocr_data.gender} />
                  )}
                  {detailUser.ocr_data?.date_of_birth && (
                    <DetailRow label="Дата рождения" value={String(detailUser.ocr_data.date_of_birth).split('T')[0]} />
                  )}

                  {/* Document details */}
                  {(detailUser.ocr_data?.document_number || detailUser.ocr_data?.document_series) && (
                    <DetailRow label="Документ" value={
                      [detailUser.ocr_data.document_series, detailUser.ocr_data.document_number].filter(Boolean).join(' ')
                    } />
                  )}
                  {detailUser.ocr_data?.authority && (
                    <DetailRow label="Кем выдан" value={detailUser.ocr_data.authority} />
                  )}
                  {detailUser.ocr_data?.issued_date && (
                    <DetailRow label="Дата выдачи" value={String(detailUser.ocr_data.issued_date).split('T')[0]} />
                  )}
                  {detailUser.ocr_data?.expired_date && (
                    <DetailRow label="Действителен до" value={String(detailUser.ocr_data.expired_date).split('T')[0]} />
                  )}
                  {detailUser.ocr_data?.address && (
                    <DetailRow label="Адрес регистрации" value={detailUser.ocr_data.address} />
                  )}

                  {/* Face Match убран — в OTC liveness flow вырезан, поле всегда пустое или null. */}
                  {/* Liveness/face-match вырезаны в OTC-flow (file-only KYC). */}

                  {/* Features list (Didit) */}
                  {detailUser.ocr_data?.features && Array.isArray(detailUser.ocr_data.features) && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {detailUser.ocr_data.features.map((f: string, i: number) => {
                        const [name, status] = f.includes(':') ? f.split(':') : [f, ''];
                        return (
                          <Badge key={i} variant={status === 'Approved' ? 'default' : 'outline'} className="text-xs">
                            {name}
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  {/* Technologies list (BV) */}
                  {detailUser.ocr_data.technologies && Array.isArray(detailUser.ocr_data.technologies) && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {detailUser.ocr_data.technologies.map((t: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                  )}

                  {/* Photos: portrait + document source */}
                  {(() => {
                    const portraitSrc = freshPortraitUrl || detailUser.ocr_data?.portrait_image;
                    const docSrc = freshDocSourceUrl || detailUser.ocr_data?.face_match_source;
                    if (!portraitSrc && !docSrc) return null;
                    return (
                      <div className="mt-2 flex gap-3">
                        {portraitSrc && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Портрет</p>
                            <a href={portraitSrc} target="_blank" rel="noopener noreferrer">
                              <img
                                src={portraitSrc}
                                alt="Portrait"
                                className="w-20 h-24 object-cover rounded-lg border border-border/50 cursor-pointer hover:opacity-80"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                              />
                            </a>
                          </div>
                        )}
                        {docSrc && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Документ</p>
                            <a href={docSrc} target="_blank" rel="noopener noreferrer">
                              <img
                                src={docSrc}
                                alt="Document"
                                className="w-24 h-20 object-cover rounded-lg border border-border/50 cursor-pointer hover:opacity-80"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                              />
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Failure reasons */}
                  {detailUser.ocr_data?.failure_reasons?.length > 0 && (
                    <div className="mt-2 p-2 rounded bg-destructive/10 border border-destructive/20">
                      <p className="text-xs text-destructive">
                        {detailUser.ocr_data.failure_reasons.map((r: any) =>
                          typeof r === 'string' ? r : `${r.type}: ${r.detail || ''}`
                        ).join('; ')}
                      </p>
                    </div>
                  )}

                  {/* Raw provider dump — every additional field the provider
                      sent that we don't rendered above. Collapsed by default
                      so the main view stays clean; open for audit. */}
                  {detailUser.ocr_data && (() => {
                    const RENDERED_KEYS = new Set([
                      'full_name', 'first_name', 'last_name', 'patronymic',
                      'personal_number', 'gender', 'date_of_birth',
                      'document_number', 'document_series', 'document_type',
                      'authority', 'issued_date', 'expired_date', 'address',
                      'face_match_score', 'liveness_score',
                      'bv_status', 'didit_status',
                      'features', 'technologies',
                      'portrait_image', 'face_match_source',
                      'failure_reasons',
                      'country',
                    ]);
                    const extras = Object.entries(detailUser.ocr_data as Record<string, unknown>)
                      .filter(([k, v]) => !RENDERED_KEYS.has(k) && v != null && v !== '');
                    if (extras.length === 0) return null;
                    return (
                      <details className="mt-3 pt-3 border-t border-border/50">
                        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                          Показать все поля от провайдера ({extras.length})
                        </summary>
                        <div className="mt-2 space-y-1 text-xs">
                          {extras.map(([k, v]) => {
                            const display = typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
                              ? String(v)
                              : JSON.stringify(v);
                            return (
                              <div key={k} className="flex gap-2">
                                <span className="text-muted-foreground font-mono">{k}:</span>
                                <span className="font-mono break-all">{display}</span>
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    );
                  })()}
                </div>
              )}

              {/* Uploaded photos */}
              {(detailUser.document_url || detailUser.selfie_url) && (
                <div className="space-y-3 p-4 rounded-lg bg-secondary/30 border border-border/50">
                  <h4 className="font-medium text-sm">Загруженные фото</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {detailUser.document_url && (
                      <div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <FileText className="w-3 h-3" />
                          Документ
                        </div>
                        {docSignedUrl ? (
                          <a href={docSignedUrl} target="_blank" rel="noopener noreferrer">
                            <img
                              src={docSignedUrl}
                              alt="Документ"
                              className="w-full h-32 object-cover rounded-lg border border-border/50 cursor-pointer hover:opacity-80 transition-opacity"
                            />
                          </a>
                        ) : (
                          <div className="w-full h-32 rounded-lg border border-border/50 flex items-center justify-center">
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    )}
                    {detailUser.selfie_url && (
                      <div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Camera className="w-3 h-3" />
                          Селфи
                        </div>
                        {selfieSignedUrl ? (
                          <a href={selfieSignedUrl} target="_blank" rel="noopener noreferrer">
                            <img
                              src={selfieSignedUrl}
                              alt="Селфи"
                              className="w-full h-32 object-cover rounded-lg border border-border/50 cursor-pointer hover:opacity-80 transition-opacity"
                            />
                          </a>
                        ) : (
                          <div className="w-full h-32 rounded-lg border border-border/50 flex items-center justify-center">
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="space-y-3 p-4 rounded-lg bg-secondary/30 border border-border/50">
                <h4 className="font-medium text-sm">Хронология</h4>
                <DetailRow label="Регистрация" value={formatDate(detailUser.created_at)} />
                <DetailRow label="Заявка KYC" value={formatDate(detailUser.kyc_created_at)} />
                <DetailRow label="Последнее обновление" value={formatDate(detailUser.kyc_updated_at)} />
                <DetailRow label="Верифицирован" value={formatDate(detailUser.verified_at)} />
              </div>

              {/* Rejection reason */}
              {detailUser.kyc_status === "rejected" && detailUser.rejection_reason && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <h4 className="font-medium text-sm text-destructive mb-1">Причина отклонения</h4>
                  <p className="text-sm">{detailUser.rejection_reason}</p>
                </div>
              )}

              {/* Actions */}
              {canReview(detailUser.kyc_status) && (
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    className="flex-1 gap-1"
                    onClick={() => approveMutation.mutate(detailUser.user_id)}
                    disabled={approveMutation.isPending}
                  >
                    {approveMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ThumbsUp className="w-4 h-4" />
                    )}
                    Одобрить KYC
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 gap-1"
                    onClick={() => handleRejectClick(detailUser.user_id)}
                    disabled={rejectMutation.isPending}
                  >
                    <ThumbsDown className="w-4 h-4" />
                    Отклонить
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Отклонить KYC</DialogTitle>
            <DialogDescription>
              Укажите причину отклонения верификации. Пользователь увидит эту причину.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Причина отклонения..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={3}
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Отклонение...
                </>
              ) : (
                "Отклонить"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </RequirePermission>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}

const colorMap: Record<string, { gradient: string; iconBg: string; iconText: string; valueText: string }> = {
  cyan: {
    gradient: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(59,130,246,0.08))',
    iconBg: 'bg-primary/10',
    iconText: 'text-primary',
    valueText: 'text-foreground',
  },
  emerald: {
    gradient: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(34,197,94,0.08))',
    iconBg: 'bg-emerald-500/10',
    iconText: 'text-emerald-400',
    valueText: 'text-emerald-400',
  },
  yellow: {
    gradient: 'linear-gradient(135deg, rgba(234,179,8,0.08), rgba(249,115,22,0.08))',
    iconBg: 'bg-yellow-500/10',
    iconText: 'text-yellow-400',
    valueText: 'text-yellow-400',
  },
  slate: {
    gradient: 'linear-gradient(135deg, rgba(100,116,139,0.08), rgba(71,85,105,0.08))',
    iconBg: 'bg-slate-500/10',
    iconText: 'text-muted-foreground',
    valueText: 'text-muted-foreground',
  },
};

function StatCard({ label, value, icon: Icon, color = 'cyan' }: { label: string; value: number; icon: React.ElementType; color?: string }) {
  const c = colorMap[color] || colorMap.cyan;
  return (
    <div className="admin-stat-card" style={{ background: c.gradient }}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-12 h-12 rounded-xl ${c.iconBg} flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${c.iconText}`} />
        </div>
      </div>
      <p className={`text-2xl font-bold ${c.valueText}`}>{value}</p>
      <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}
