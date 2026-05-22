import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useUserDocuments, type Document } from "@/hooks/useDocuments";
import { getDocumentDownloadUrl } from "@/utils/pdf/documentService";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { buildCompanyData } from "@/utils/pdf/companyData";
import type { CompanyData } from "@/utils/pdf/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Download,
  FileText,
  FolderOpen,
  Loader2,
  Plus,
} from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { toast } from "sonner";

const typeLabels: Record<string, string> = {
  order_pdf: "Заявка",
  finnadzor_report: "Отчёт",
  cover_letter: "Письмо",
};

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const Documents = () => {
  const { data: documents, isLoading } = useUserDocuments();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (doc: Document) => {
    setDownloadingId(doc.id);
    try {
      const url = await getDocumentDownloadUrl(doc.storage_path);
      const link = document.createElement("a");
      link.href = url;
      link.download = doc.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Не удалось скачать документ");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <DashboardLayout
      title="Документы"
      description="Ваши сгенерированные документы"
    >
      <div className="max-w-3xl">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-9 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !documents || documents.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-amber-700/10 flex items-center justify-center mx-auto mb-6">
                <FolderOpen className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">У вас пока нет документов</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Документы появятся после завершения ваших заявок на обмен
              </p>
              <Button asChild variant="gradient" size="lg">
                <Link to="/" className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Создать заявку
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <Card
                key={doc.id}
                className="overflow-hidden hover:shadow-lg transition-shadow"
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p
                          className="font-medium truncate"
                          title={doc.file_name}
                        >
                          {doc.file_name}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <Badge variant="secondary" className="text-xs">
                            {typeLabels[doc.type] || doc.type}
                          </Badge>
                          <span>
                            {format(
                              new Date(doc.created_at),
                              "dd MMM yyyy, HH:mm",
                              { locale: ru }
                            )}
                          </span>
                          {doc.file_size && (
                            <span>{formatFileSize(doc.file_size)}</span>
                          )}
                        </div>
                        {doc.order_id && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Заявка #{doc.order_id.slice(0, 8)}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(doc)}
                      disabled={downloadingId === doc.id}
                    >
                      {downloadingId === doc.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      Скачать
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Documents;
