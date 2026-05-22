import jsPDF from 'jspdf';
import { PAGE_MARGIN } from '../constants';
import { OrderType, CompanyData } from '../types';
import { formatDate } from '../helpers';

/**
 * Get document title based on order type
 */
const getTitleText = (orderType: OrderType): string => {
  switch (orderType) {
    case 'buy':
      return 'ЗАЯВКА НА ПОКУПКУ ВИРТУАЛЬНЫХ АКТИВОВ';
    case 'sell':
      return 'ЗАЯВКА НА ПРОДАЖУ ВИРТУАЛЬНЫХ АКТИВОВ';
    case 'exchange':
      return 'ЗАЯВКА НА ОБМЕН ВИРТУАЛЬНЫХ АКТИВОВ';
  }
};

/**
 * Get operation word based on order type
 */
const getOperationWord = (orderType: OrderType): string => {
  switch (orderType) {
    case 'buy':
      return 'ПОКУПКУ';
    case 'sell':
      return 'ПРОДАЖУ';
    case 'exchange':
      return 'ОБМЕН';
  }
};

/**
 * Render document title and preamble
 * Compact version for single-page electronic document
 */
export const renderTitle = (
  doc: jsPDF,
  orderType: OrderType,
  createdAt: string,
  startY: number,
  company: CompanyData
): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = startY;

  // Main title - centered, bold
  doc.setFontSize(12);
  doc.setFont('Roboto', 'bold');
  doc.text(getTitleText(orderType), pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // City and date line
  doc.setFontSize(9);
  doc.setFont('Roboto', 'normal');
  doc.text('г. Бишкек', PAGE_MARGIN, yPos);
  doc.text(formatDate(createdAt), pageWidth - PAGE_MARGIN, yPos, { align: 'right' });
  yPos += 8;

  // Preamble text (compact)
  doc.setFontSize(8);
  const offerUrl = company.website || 'https://example.com';
  const preambleText = `Настоящим я выражаю согласие с условиями Публичной оферты (${offerUrl}) и направляю безотзывное поручение на ${getOperationWord(orderType)} виртуальных активов (ВА):`;
  const preambleLines = doc.splitTextToSize(preambleText, pageWidth - PAGE_MARGIN * 2);
  doc.text(preambleLines, PAGE_MARGIN, yPos);
  yPos += preambleLines.length * 4 + 6;

  return yPos;
};
