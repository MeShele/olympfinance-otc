import jsPDF from 'jspdf';
import { OrderData, OrderType, CompanyData } from './types';
import { determineOrderType, setupFonts } from './helpers';
import { renderHeader } from './sections/header';
import { renderTitle } from './sections/title';
import { renderBuyTable, renderSellTable, renderExchangeTable } from './sections/tables';
import { renderBuyDetails, renderSellDetails, renderExchangeDetails } from './sections/details';
import { renderConfirmation, renderDocumentFooter } from './sections/footer';

/**
 * Generate PDF and return as blob URL for preview
 */
export const generateOrderPDFBlob = async (
  order: OrderData,
  company: CompanyData,
  isAdmin: boolean = false
): Promise<{ blobUrl: string; blob: Blob; fileName: string }> => {
  const doc = new jsPDF();

  // Load and setup Cyrillic fonts
  const fontsLoaded = await setupFonts(doc);
  if (!fontsLoaded) {
    console.warn('Fonts not loaded, PDF may not display Cyrillic correctly');
  }

  // Determine order type based on currencies
  const orderType = determineOrderType(order.fromCurrency, order.toCurrency);

  // Render header (right-aligned with operator info)
  let yPos = await renderHeader(doc, order.clientName, company);

  // Render title and preamble
  yPos = renderTitle(doc, orderType, order.createdAt, yPos, company);

  // Render appropriate table based on order type
  switch (orderType) {
    case 'buy':
      yPos = renderBuyTable(doc, order, yPos, company);
      yPos = renderBuyDetails(doc, order, yPos);
      break;
    case 'sell':
      yPos = renderSellTable(doc, order, yPos, company);
      yPos = renderSellDetails(doc, order, yPos);
      break;
    case 'exchange':
      yPos = renderExchangeTable(doc, order, yPos, company);
      yPos = renderExchangeDetails(doc, order, yPos);
      break;
  }

  // Render confirmation text
  yPos = renderConfirmation(doc, orderType, yPos);

  // Render document footer with stamp (no signatures - electronic document)
  await renderDocumentFooter(doc, order.orderNumber, order.id, company);

  // Generate filename based on order type and user role
  const typeNames: Record<OrderType, string> = {
    buy: 'покупка',
    sell: 'продажа',
    exchange: 'обмен'
  };

  const fileName = `заявка_${typeNames[orderType]}_${order.orderNumber}_${isAdmin ? 'оператор' : 'клиент'}.pdf`;

  // Get blob and create URL
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);

  return { blobUrl, blob, fileName };
};

/**
 * Download PDF from blob URL
 */
export const downloadPDFFromBlob = (blobUrl: string, fileName: string): void => {
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Revoke blob URL to free memory
 */
export const revokePDFBlob = (blobUrl: string): void => {
  URL.revokeObjectURL(blobUrl);
};
