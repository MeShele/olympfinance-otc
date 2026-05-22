import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, Loader2, FileText } from "lucide-react";
import {
  generateOrderPDFBlob,
  downloadPDFFromBlob,
  revokePDFBlob
} from "@/utils/pdf/previewGenerator";
import type { OrderData, CompanyData } from "@/utils/pdf/types";

interface PDFPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderData: OrderData | null;
  company: CompanyData;
  isAdmin?: boolean;
}

export const PDFPreviewModal = ({
  open,
  onOpenChange,
  orderData,
  company,
  isAdmin = false,
}: PDFPreviewModalProps) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (open && orderData) {
      generatePDF();
    }

    return () => {
      if (pdfUrl) {
        revokePDFBlob(pdfUrl);
        setPdfUrl(null);
      }
    };
  }, [open, orderData]);

  const generatePDF = async () => {
    if (!orderData) return;

    setIsLoading(true);
    try {
      const { blobUrl, fileName: generatedFileName } = await generateOrderPDFBlob(
        orderData,
        company,
        isAdmin
      );
      setPdfUrl(blobUrl);
      setFileName(generatedFileName);
    } catch (error) {
      console.error("Failed to generate PDF preview:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!pdfUrl) return;

    setIsDownloading(true);
    try {
      downloadPDFFromBlob(pdfUrl, fileName);
    } finally {
      setIsDownloading(false);
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    if (pdfUrl) {
      revokePDFBlob(pdfUrl);
      setPdfUrl(null);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Предпросмотр документа
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 px-6 pb-2 min-h-0">
          {isLoading ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-muted/30 rounded-lg">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Генерация документа...</p>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full rounded-lg border bg-white"
              title="PDF Preview"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-muted/30 rounded-lg">
              <FileText className="w-12 h-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Не удалось загрузить документ</p>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            <X className="w-4 h-4 mr-2" />
            Закрыть
          </Button>
          <Button
            variant="gradient"
            onClick={handleDownload}
            disabled={!pdfUrl || isDownloading}
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Скачать PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
