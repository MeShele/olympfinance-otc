import jsPDF from 'jspdf';
import { PAGE_MARGIN } from '../constants';
import { OrderData } from '../types';

const UNDERLINE = '_______________________________________________';

/**
 * Render section header (compact)
 */
const renderSectionHeader = (doc: jsPDF, title: string, yPos: number): number => {
  doc.setFontSize(9);
  doc.setFont('Roboto', 'bold');
  doc.text(title, PAGE_MARGIN, yPos);
  doc.setFont('Roboto', 'normal');
  return yPos + 6;
};

/**
 * Render a labeled field with value or blank (compact)
 */
const renderField = (
  doc: jsPDF,
  label: string,
  value: string | undefined,
  yPos: number
): number => {
  doc.setFontSize(8);
  doc.setFont('Roboto', 'normal');

  if (value && value.trim()) {
    doc.text(`${label}: ${value}`, PAGE_MARGIN, yPos);
  } else {
    doc.text(`${label}: ${UNDERLINE}`, PAGE_MARGIN, yPos);
  }

  return yPos + 5;
};

/**
 * Get network display from order data, fallback to currency code
 */
const getOrderNetwork = (order: OrderData, currency: string): string => {
  return order.networkName || currency;
};

const METHOD_LABELS: Record<string, string> = {
  asystem: 'Olymp Finance KYC (собственная верификация)',
  'asystem-kyc': 'Olymp Finance KYC (собственная верификация)',
  biometric_vision: 'Biometric Vision',
  'biometric-vision': 'Biometric Vision',
  bv_tunduk: 'Biometric Vision (Тундук)',
  bv_full: 'Biometric Vision (Full)',
  sumsub: 'Sumsub',
  'sumsub-kyc': 'Sumsub',
  didit: 'Didit',
  'didit-kyc': 'Didit',
  manual: 'Ручная проверка',
};

const formatKycDate = (raw?: string): string | undefined => {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  return trimmed;
};

/**
 * Render the KYC identity block (aggregated from kyc_verifications +
 * provider-specific ocr_data). Skipped entirely when KYC is absent so the
 * generator stays quiet for anonymous / pre-KYC clients.
 */
export const renderKycSection = (doc: jsPDF, order: OrderData, startY: number): number => {
  const kyc = order.kyc;
  if (!kyc) return startY;

  const hasAny = !!(
    kyc.fullName || kyc.documentNumber || kyc.dateOfBirth ||
    kyc.country || kyc.authority || kyc.address || kyc.personalNumber
  );
  if (!hasAny) return startY;

  let yPos = startY + 3;
  yPos = renderSectionHeader(doc, 'KYC / ИДЕНТИФИКАЦИЯ КЛИЕНТА:', yPos);

  yPos = renderField(doc, 'ФИО', kyc.fullName, yPos);
  yPos = renderField(doc, 'Дата рождения', formatKycDate(kyc.dateOfBirth), yPos);
  yPos = renderField(doc, 'Страна', kyc.country, yPos);
  yPos = renderField(doc, 'Тип документа', kyc.documentType, yPos);
  const docNumberDisplay = kyc.documentSeries && kyc.documentNumber
    ? `${kyc.documentSeries} ${kyc.documentNumber}`
    : kyc.documentNumber;
  yPos = renderField(doc, '№ документа', docNumberDisplay, yPos);
  yPos = renderField(doc, 'Персональный №', kyc.personalNumber, yPos);
  yPos = renderField(doc, 'Дата выдачи', formatKycDate(kyc.issuedDate), yPos);
  yPos = renderField(doc, 'Срок действия', formatKycDate(kyc.expiryDate), yPos);
  yPos = renderField(doc, 'Кем выдан', kyc.authority, yPos);
  yPos = renderField(doc, 'Адрес регистрации', kyc.address, yPos);

  if (kyc.verificationMethod) {
    const methodLabel = METHOD_LABELS[kyc.verificationMethod] ?? kyc.verificationMethod;
    yPos = renderField(doc, 'Метод верификации', methodLabel, yPos);
  }
  yPos = renderField(doc, 'Дата верификации', formatKycDate(kyc.verifiedAt), yPos);

  return yPos + 2;
};

/**
 * Render BUY order details (payment and receiving sections)
 * Compact version for single-page layout
 */
export const renderBuyDetails = (doc: jsPDF, order: OrderData, startY: number): number => {
  let yPos = startY;

  // PAYMENT DETAILS section
  yPos = renderSectionHeader(doc, 'ДЕТАЛИ ОПЛАТЫ (Фиат):', yPos);
  yPos = renderField(doc, 'Способ оплаты', order.paymentMethod, yPos);

  doc.setFontSize(8);
  doc.text('Реквизиты оплаты:', PAGE_MARGIN, yPos);
  yPos += 4;

  if (order.bankAccountInfo && order.bankAccountInfo.trim()) {
    // Per-currency bank accounts
    const lines = order.bankAccountInfo.split('\n');
    for (const line of lines) {
      doc.text(line, PAGE_MARGIN, yPos);
      yPos += 4;
    }
  } else if (order.paymentDetails && order.paymentDetails.trim()) {
    doc.text(order.paymentDetails, PAGE_MARGIN, yPos);
    yPos += 4;
  } else {
    doc.text(UNDERLINE, PAGE_MARGIN, yPos);
    yPos += 4;
  }

  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('(Банк / Карта / Кошелек)', PAGE_MARGIN, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 8;

  // RECEIVING VA DETAILS section
  yPos = renderSectionHeader(doc, 'ДЕТАЛИ ПОЛУЧЕНИЯ ВА:', yPos);

  const toNetwork = getOrderNetwork(order, order.toCurrency);
  yPos = renderField(doc, 'Адрес кошелька', order.walletAddress, yPos);
  yPos = renderField(doc, 'Сеть', toNetwork, yPos);

  yPos = renderKycSection(doc, order, yPos);

  return yPos + 5;
};

/**
 * Render SELL order details (sending VA and receiving fiat sections)
 * Compact version for single-page layout
 */
export const renderSellDetails = (doc: jsPDF, order: OrderData, startY: number): number => {
  let yPos = startY;

  const fromNetwork = getOrderNetwork(order, order.fromCurrency);

  // OPERATOR WALLET section (for sending VA)
  yPos = renderSectionHeader(doc, 'РЕКВИЗИТЫ ДЛЯ ОТПРАВКИ ВА (Кошелек Оператора):', yPos);
  yPos = renderField(doc, 'Адрес кошелька', order.operatorWallet, yPos);
  yPos = renderField(doc, 'Сеть / Протокол', fromNetwork, yPos);

  // Sender wallet (client crypto address)
  if (order.senderWallet) {
    yPos = renderField(doc, 'Кошелёк отправителя (клиент)', order.senderWallet, yPos);
  }
  yPos += 3;

  // RECEIVING FIAT section
  yPos = renderSectionHeader(doc, 'ДЕТАЛИ ПОЛУЧЕНИЯ СРЕДСТВ (Фиат):', yPos);

  doc.setFontSize(8);
  doc.text(`Способ получения: ${UNDERLINE}`, PAGE_MARGIN, yPos);
  yPos += 4;

  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('(банк / карта / кошелек / наличные)', PAGE_MARGIN, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 6;

  doc.setFontSize(8);
  yPos = renderField(doc, 'Банк / Система', order.bankName, yPos);
  yPos = renderField(doc, 'Номер счета / карты', order.cardNumber, yPos);
  yPos = renderField(doc, 'ФИО получателя', order.recipientName || order.clientName, yPos);

  yPos = renderKycSection(doc, order, yPos);

  return yPos + 5;
};

/**
 * Render EXCHANGE order details (what user sends and receives)
 * Compact version for single-page layout
 */
export const renderExchangeDetails = (doc: jsPDF, order: OrderData, startY: number): number => {
  let yPos = startY;

  const fromNetwork = getOrderNetwork(order, order.fromCurrency);
  const toNetwork = getOrderNetwork(order, order.toCurrency);

  // A) WHAT USER SENDS section
  yPos = renderSectionHeader(doc, 'А) ЧТО ОТПРАВЛЯЕТ ПОЛЬЗОВАТЕЛЬ', yPos);

  doc.setFontSize(8);
  doc.text(`Тип актива: ${order.fromCurrency} (ВА)`, PAGE_MARGIN, yPos);
  yPos += 5;

  yPos = renderField(doc, 'Реквизиты Оператора', order.operatorWallet, yPos);

  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('(Адрес кошелька / Банковские реквизиты)', PAGE_MARGIN, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 5;

  yPos = renderField(doc, 'Сеть (если ВА)', fromNetwork, yPos);

  if (order.senderWallet) {
    yPos = renderField(doc, 'Кошелёк отправителя (клиент)', order.senderWallet, yPos);
  }
  yPos += 3;

  // B) WHAT USER RECEIVES section
  yPos = renderSectionHeader(doc, 'Б) ЧТО ПОЛУЧАЕТ ПОЛЬЗОВАТЕЛЬ', yPos);

  doc.setFontSize(8);
  doc.text(`Тип актива: ${order.toCurrency} (ВА)`, PAGE_MARGIN, yPos);
  yPos += 5;

  yPos = renderField(doc, 'Адрес кошелька (если ВА)', order.walletAddress, yPos);
  yPos = renderField(doc, 'Сеть (если ВА)', toNetwork, yPos);

  doc.text('Реквизиты получения (если Фиат):', PAGE_MARGIN, yPos);
  yPos += 4;
  doc.text(UNDERLINE, PAGE_MARGIN, yPos);
  yPos += 4;

  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('(Банк / Карта / Кошелек / ФИО)', PAGE_MARGIN, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 5;

  yPos = renderKycSection(doc, order, yPos);

  return yPos + 8;
};
