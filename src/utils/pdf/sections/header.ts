import jsPDF from 'jspdf';
import { PAGE_MARGIN, RIGHT_BLOCK_START } from '../constants';
import { CompanyData } from '../types';
import { loadCompanyLogo } from '../helpers';

// Compact line height for single-page layout
const COMPACT_LINE_HEIGHT = 5;

/**
 * Render document header — слева логотип компании (если задан),
 * справа реквизиты + блок «От Пользователя».
 */
export const renderHeader = async (
  doc: jsPDF,
  clientName: string = '',
  company: CompanyData
): Promise<number> => {
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 15; // Start higher

  // Логотип компании-владельца обменника слева сверху. Раньше тут
  // ничего не было — клиент видел только текст «Кому: …» справа.
  if (company.logoUrl) {
    const logo = await loadCompanyLogo(company.logoUrl);
    if (logo) {
      try {
        // Бокс 35×20mm — оптимум по ширине header'а (страница ~210mm,
        // справа реквизиты занимают ~110mm). PNG может быть с прозрачным
        // фоном, JPEG — без.
        doc.addImage(logo.base64, logo.format, PAGE_MARGIN, yPos, 35, 20);
      } catch (err) {
        console.warn('header logo render failed', err);
      }
    }
  }

  doc.setFontSize(9);
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(0, 0, 0);

  // Right-aligned header block
  const rightX = RIGHT_BLOCK_START;
  const maxWidth = pageWidth - rightX - PAGE_MARGIN;

  // To: Director line (compact)
  const toLine = `Кому: Генеральному директору ${company.companyName}`;
  const toLines = doc.splitTextToSize(toLine, maxWidth);
  doc.text(toLines, rightX, yPos);
  yPos += toLines.length * COMPACT_LINE_HEIGHT;

  // INN and OKPO
  doc.setFontSize(8);
  const innLine = `ИНН: ${company.inn}, ОКПО: ${company.okpo}`;
  doc.text(innLine, rightX, yPos);
  yPos += COMPACT_LINE_HEIGHT;

  // Address (compact)
  const addressLine = `Адрес: ${company.legalAddress}`;
  const addressLines = doc.splitTextToSize(addressLine, maxWidth);
  doc.text(addressLines, rightX, yPos);
  yPos += addressLines.length * COMPACT_LINE_HEIGHT + 4;

  // From user section
  doc.setFontSize(9);
  doc.text('От Пользователя:', rightX, yPos);
  yPos += COMPACT_LINE_HEIGHT;

  // Client name or blank line
  if (clientName && clientName.trim()) {
    doc.setFont('Roboto', 'bold');
    doc.text(clientName, rightX, yPos);
    doc.setFont('Roboto', 'normal');
  } else {
    doc.text('_______________________________________', rightX, yPos);
  }
  yPos += COMPACT_LINE_HEIGHT;

  // Label under the line
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('(ФИО полностью / Наименование)', rightX, yPos);
  doc.setTextColor(0, 0, 0);

  return yPos + 10;
};
