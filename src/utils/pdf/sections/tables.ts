import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PAGE_MARGIN } from '../constants';
import { OrderData, CompanyData } from '../types';
import { formatNumber, formatRate, isCryptoCurrency } from '../helpers';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

/**
 * Get network display name from order data, fallback to currency code
 */
const getOrderNetwork = (order: OrderData, currency: string): string => {
  return order.networkName || currency;
};

/**
 * Реальная комиссия операции. Раньше PDF всегда брал
 * company.feePercent × fromAmount — это глобальная ставка обменника,
 * но в реальности orders.fee может отличаться (скидка/VIP/ручная правка).
 * Если order.fee задан явно — используем его и считаем процент обратно
 * для отображения. Иначе fallback на тариф из company_settings.
 */
const resolveFee = (
  order: OrderData,
  feePercent: number,
): { percentDisplay: number; amount: number } => {
  if (order.fee != null && order.fee > 0 && order.fromAmount > 0) {
    return {
      amount: order.fee,
      percentDisplay: (order.fee / order.fromAmount) * 100,
    };
  }
  return {
    amount: order.fromAmount * (feePercent / 100),
    percentDisplay: feePercent,
  };
};

/**
 * Render tariff line
 */
const renderTariffLine = (
  doc: jsPDF,
  percentDisplay: number,
  amount: number,
  currency: string,
  yPos: number,
): void => {
  const pct = percentDisplay.toFixed(percentDisplay >= 10 ? 1 : 2);
  doc.text(
    `Комиссия: ${pct}% (${formatNumber(amount, isCryptoCurrency(currency))} ${currency})`,
    PAGE_MARGIN,
    yPos,
  );
};

/**
 * Render table for BUY orders (Fiat -> Crypto)
 * Compact version for single-page layout
 */
export const renderBuyTable = (doc: jsPDF, order: OrderData, startY: number, company: CompanyData): number => {
  const toCrypto = order.toCurrency;
  const toNetwork = getOrderNetwork(order, toCrypto);
  const fromFiat = order.fromCurrency;

  const tableData = [
    [
      toCrypto,
      toNetwork,
      `${formatNumber(order.fromAmount, false)} ${fromFiat}`,
      `≈ ${formatNumber(order.toAmount, true)} ${toCrypto}`
    ]
  ];

  autoTable(doc, {
    startY: startY,
    head: [[
      'Наименование ВА',
      'Сеть / Протокол',
      'Сумма к оплате',
      'Сумма ВА (примерно)'
    ]],
    body: tableData,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      halign: 'center',
      font: 'Roboto',
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      font: 'Roboto',
      fontSize: 8
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  let yPos = doc.lastAutoTable.finalY + 5;

  // Rate and tariff lines (compact)
  doc.setFontSize(8);
  doc.setFont('Roboto', 'normal');
  doc.text(`Курс обмена: ${formatRate(order.rate, order.fromCurrency, order.toCurrency)}`, PAGE_MARGIN, yPos);
  yPos += 5;
  const fee = resolveFee(order, company.feePercent);
  renderTariffLine(doc, fee.percentDisplay, fee.amount, order.fromCurrency, yPos);

  return yPos + 8;
};

/**
 * Render table for SELL orders (Crypto -> Fiat)
 * Compact version for single-page layout
 */
export const renderSellTable = (doc: jsPDF, order: OrderData, startY: number, company: CompanyData): number => {
  const fromCrypto = order.fromCurrency;
  const fromNetwork = getOrderNetwork(order, fromCrypto);
  const toFiat = order.toCurrency;

  const tableData = [
    [
      fromCrypto,
      fromNetwork,
      `${formatNumber(order.fromAmount, true)} ${fromCrypto}`,
      `${formatNumber(order.toAmount, false)} ${toFiat}`
    ]
  ];

  autoTable(doc, {
    startY: startY,
    head: [[
      'Наименование ВА',
      'Сеть / Протокол',
      'Сумма ВА',
      'Сумма к получению (Фиат)'
    ]],
    body: tableData,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      halign: 'center',
      font: 'Roboto',
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      font: 'Roboto',
      fontSize: 8
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  let yPos = doc.lastAutoTable.finalY + 5;

  // Rate and tariff lines (compact)
  doc.setFontSize(8);
  doc.setFont('Roboto', 'normal');
  doc.text(`Курс обмена: ${formatRate(order.rate, order.fromCurrency, order.toCurrency)}`, PAGE_MARGIN, yPos);
  yPos += 5;
  const fee = resolveFee(order, company.feePercent);
  renderTariffLine(doc, fee.percentDisplay, fee.amount, order.fromCurrency, yPos);

  return yPos + 8;
};

/**
 * Render table for EXCHANGE orders (Crypto -> Crypto)
 * Compact version for single-page layout
 */
export const renderExchangeTable = (doc: jsPDF, order: OrderData, startY: number, company: CompanyData): number => {
  const fromNetwork = getOrderNetwork(order, order.fromCurrency);
  const toNetwork = getOrderNetwork(order, order.toCurrency);

  // Exchange table has a special dual-header structure
  autoTable(doc, {
    startY: startY,
    head: [[
      { content: 'ОТДАЮ', colSpan: 2, styles: { halign: 'center' } },
      { content: 'ПОЛУЧАЮ', colSpan: 2, styles: { halign: 'center' } }
    ], [
      'Наименование',
      'Сумма',
      'Наименование',
      'Сумма'
    ]],
    body: [[
      `${order.fromCurrency} (${fromNetwork})`,
      `${formatNumber(order.fromAmount, isCryptoCurrency(order.fromCurrency))} ${order.fromCurrency}`,
      `${order.toCurrency} (${toNetwork})`,
      `${formatNumber(order.toAmount, isCryptoCurrency(order.toCurrency))} ${order.toCurrency}`
    ]],
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      halign: 'center',
      font: 'Roboto',
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      font: 'Roboto',
      fontSize: 8
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  let yPos = doc.lastAutoTable.finalY + 5;

  // Rate and tariff lines (compact)
  doc.setFontSize(8);
  doc.setFont('Roboto', 'normal');
  doc.text(`Курс конвертации: ${formatRate(order.rate, order.fromCurrency, order.toCurrency)}`, PAGE_MARGIN, yPos);
  yPos += 5;
  const fee = resolveFee(order, company.feePercent);
  renderTariffLine(doc, fee.percentDisplay, fee.amount, order.fromCurrency, yPos);

  return yPos + 8;
};
