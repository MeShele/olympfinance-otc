import jsPDF from 'jspdf';
import { PAGE_MARGIN } from '../constants';
import { OrderType, CompanyData } from '../types';
import { loadCompanyLogo } from '../helpers';

/**
 * Get confirmation text based on order type
 */
const getConfirmationText = (orderType: OrderType): string => {
  switch (orderType) {
    case 'buy':
      return 'Подтверждаю, что ознакомлен с условиями Оферты, осознаю риски, связанные с оборотом виртуальных активов, и несу ответственность за правильность предоставленных реквизитов.';
    case 'sell':
      return 'Подтверждаю, что ознакомлен с условиями Оферты, осознаю риски и гарантирую, что продаваемый мной виртуальный актив получен законным способом и не обременен правами третьих лиц.';
    case 'exchange':
      return 'Подтверждаю, что ознакомлен с условиями Оферты и осознаю риски. Гарантирую, что обмениваемые мной средства/активы получены законным способом, не являются предметом залога, не состоят под арестом и не обременены правами третьих лиц.';
  }
};

/**
 * Render confirmation text (compact version for electronic document)
 */
export const renderConfirmation = (
  doc: jsPDF,
  orderType: OrderType,
  startY: number
): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = startY;

  doc.setFontSize(8);
  doc.setFont('Roboto', 'normal');

  const confirmText = getConfirmationText(orderType);
  const confirmLines = doc.splitTextToSize(confirmText, pageWidth - PAGE_MARGIN * 2);
  doc.text(confirmLines, PAGE_MARGIN, yPos);

  // Reduced spacing for compact layout
  return yPos + confirmLines.length * 4 + 5;
};

/**
 * Render document footer with order number, ID и печать = логотип
 * компании-оператора из company.logoUrl (не статичная картинка).
 * Раньше тут была одна общая /images/company-stamp.png — выглядело
 * как чужой бренд на чеке клиента.
 */
export const renderDocumentFooter = async (
  doc: jsPDF,
  orderNumber: string,
  orderId: string,
  company?: CompanyData,
): Promise<void> => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Footer text position
  const footerY = pageHeight - 12;

  doc.setFontSize(7);
  doc.setTextColor(130, 130, 130);
  doc.setFont('Roboto', 'normal');

  doc.text(`Документ: ${orderNumber}`, PAGE_MARGIN, footerY);
  doc.text(`ID: ${orderId}`, pageWidth / 2, footerY, { align: 'center' });

  // Контакты компании справа в footer
  if (company?.phone || company?.email) {
    const contactBits: string[] = [];
    if (company.phone) contactBits.push(company.phone);
    if (company.email) contactBits.push(company.email);
    doc.text(contactBits.join(' · '), pageWidth - PAGE_MARGIN, footerY, { align: 'right' });
  }

  // Печать = логотип компании-оператора в правом нижнем углу.
  if (company?.logoUrl) {
    const logo = await loadCompanyLogo(company.logoUrl);
    if (logo) {
      try {
        const stampSize = 38;
        const stampX = pageWidth - PAGE_MARGIN - stampSize - 5;
        const stampY = pageHeight - stampSize - 18;
        doc.addImage(logo.base64, logo.format, stampX, stampY, stampSize, stampSize);
      } catch (error) {
        console.warn('Failed to add stamp to PDF:', error);
      }
    }
  }

  doc.setTextColor(0, 0, 0);
};

// Legacy export for backwards compatibility (no longer renders signatures)
export const renderSignatures = async (_doc: jsPDF, startY: number): Promise<number> => {
  // Signatures removed - electronic document
  return startY;
};
