import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { CompanySettings } from '@/hooks/useCompanySettings';
import { LiquidityProvider } from '@/hooks/useLiquidityProviders';

/** Parse operator_wallet_address (JSON array or legacy plain text) into a display string */
const getOperatorWallet = (raw?: string): string => {
  if (!raw) return '-';
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const lines = parsed.map((w: any) => w.network ? `${w.network}: ${w.address}` : w.address).filter(Boolean);
      return lines.length > 0 ? lines.join('; ') : '-';
    }
  } catch {}
  return raw || '-';
};
import {
  OrderData,
  applyPrintSetup,
  applyTxHeaderStyle,
  applyTxDataStyle,
  addPageHeader,
  addSignatureBlock,
  subtitleFont,
  txDataFont,
  thinBorder,
  headerAlignment,
  compactHeaderFont,
  compactDataFont,
  estimateRowHeight,
  formatClientName,
  getPaymentMethod,
  getResidencyStatus,
} from './styles';

/** Parse sender_wallet from order notes JSON (for sell/swap orders) */
const getSenderWallet = (notes: string | null): string | null => {
  if (!notes) return null;
  try {
    const parsed = JSON.parse(notes);
    return parsed.sender_wallet || null;
  } catch {
    return null;
  }
};

/** Parse bank_name from order notes JSON (for buy orders with per-currency bank accounts) */
const getBankFromNotes = (notes: string | null): string | null => {
  if (!notes) return null;
  try {
    const parsed = JSON.parse(notes);
    if (parsed?.payment?.bank_details) {
      // Extract first bank name from the bank_details string
      const match = parsed.payment.bank_details.match(/Банк:\s*(.+)/);
      return match ? match[1].trim() : null;
    }
    return parsed.bank_name || null;
  } catch {
    return null;
  }
};

/**
 * Format exchange rate for display in the report.
 * The rate stored in orders is from_currency per 1 to_currency unit.
 * For sell orders (crypto→fiat): rate is like 87.45 (1 USDT = 87.45 KGS) — display as-is.
 * For buy orders (fiat→crypto): rate is like 0.0000112 (1 USD = 0.0000112 BTC) — invert to show 1 BTC = 89285 USD.
 */
const formatRate = (fromCur: string, toCur: string, rate: number): string => {
  if (rate === 0) return '-';

  // If rate is very small (< 0.01), it's likely a fiat→crypto rate that needs inversion
  if (rate < 0.01 && rate > 0) {
    const inverted = 1 / rate;
    const formatted = inverted >= 1000 ? inverted.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : inverted.toFixed(2);
    return `1 ${toCur} = ${formatted} ${fromCur}`;
  }

  // Normal rate (crypto→fiat or close to 1)
  const formatted = rate >= 1000 ? rate.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : rate.toFixed(2);
  return `1 ${fromCur} = ${formatted} ${toCur}`;
};

// === Helpers for transaction sheets ===

const buildTxHeaders = (ws: ExcelJS.Worksheet, r: number, headers: string[]): number => {
  const hr = ws.getRow(r);
  hr.height = 60;
  headers.forEach((h, i) => {
    const cell = hr.getCell(i + 1);
    cell.value = h;
    applyTxHeaderStyle(cell);
  });
  return r + 1;
};

const buildTxDataRow = (ws: ExcelJS.Worksheet, r: number, values: (string | number)[], cols: number, colWidths: number[]): number => {
  const row = ws.getRow(r);
  values.forEach((v, i) => {
    const cell = row.getCell(i + 1);
    cell.value = v;
    applyTxDataStyle(cell);
  });
  row.height = estimateRowHeight(values, colWidths, 8);
  return r + 1;
};

const buildTxTotalRow = (ws: ExcelJS.Worksheet, r: number, cols: number, totals?: { volumeKgs?: number; count?: number }): number => {
  const totalRow = ws.getRow(r);

  const cells = ['Итого', '', ...Array(cols - 2).fill('-')];
  // Column 8 (index 7) is "Объём в сомах" for sheets 4/5
  if (totals?.volumeKgs && cols === 12) {
    cells[7] = totals.volumeKgs.toLocaleString('ru-RU');
  }
  cells.forEach((v, i) => {
    const cell = totalRow.getCell(i + 1);
    cell.value = v;
    applyTxDataStyle(cell);
    cell.font = { ...txDataFont, bold: true };
  });
  return r + 2;
};

// === Sheet 4: Приложение 4/о — Продажа ВА (12 columns) ===

export const buildSellSheet = (
  wb: ExcelJS.Workbook,
  settings: CompanySettings | null,
  sellOrders: OrderData[]
) => {
  const ws = wb.addWorksheet('Приложение 4-о');
  applyPrintSetup(ws);

  // A4 landscape ~277mm ≈ 196 Excel units. Optimized widths:
  ws.columns = [
    { width: 4 },   // A - №
    { width: 10 },  // B - Дата сделки
    { width: 24 },  // C - ФИО/ИНН клиента
    { width: 13 },  // D - Резидент/нерезидент
    { width: 8 },   // E - Наименование ВА
    { width: 24 },  // F - Курс обмена
    { width: 18 },  // G - Объём (иностр. валюта)
    { width: 14 },  // H - Объём (сомы)
    { width: 12 },  // I - Метод расчета
    { width: 24 },  // J - Кошелёк оператора
    { width: 24 },  // K - Кошелёк клиента
    { width: 7 },   // L - KYC
  ];

  const cols = 12;
  addPageHeader(ws, 4, 'Приложение 4/о', cols);

  let r = 3;
  ws.mergeCells(r, 1, r, cols);
  ws.getCell(r, 1).value = 'Отчет по продаже виртуальных активов клиентами';
  ws.getCell(r, 1).font = subtitleFont;
  ws.getCell(r, 1).alignment = { horizontal: 'center', wrapText: true };
  r++;

  const headers = [
    '№',
    'Дата сделки',
    'Наименование и ИНН (для юридического лица) или Ф.И.О. и ID, ПИН (для физического лица) клиента',
    'Резидент/нерезидент Кыргызской Республики',
    'Наименование виртуального актива',
    'Курс обмена ВА на денежные средства',
    'Объём в денежных средствах (в инностранной валюте)',
    'Объём в денежных средств (в сомах)',
    'Метод расчета (наличный/безналичный)',
    'Адрес электронного кошелька оператора',
    'Адрес электронного кошелька клиента',
    'Идентификация клиента KYC (да/нет)',
  ];

  r = buildTxHeaders(ws, r, headers);

  const dataOrders = sellOrders.length > 0 ? sellOrders : [];
  const totalDataRows = Math.max(dataOrders.length, 4);
  const operatorWallet = getOperatorWallet(settings?.manual_wallet_address);

  for (let idx = 0; idx < totalDataRows; idx++) {
    const order = dataOrders[idx];
    const clientWallet = order ? (getSenderWallet(order.notes) || order.wallet_address || '-') : '-';
    const values = order
      ? [
          idx + 1,
          format(new Date(order.created_at), 'dd.MM.yyyy'),
          formatClientName(order),
          getResidencyStatus(order.kyc_country || null, order.is_resident ?? null),
          order.from_currency,
          formatRate(order.from_currency, order.to_currency, order.rate),
          `${order.to_amount.toLocaleString('ru-RU')} ${order.to_currency}`,
          order.amount_kgs > 0 ? order.amount_kgs.toLocaleString('ru-RU') : '-',
          getPaymentMethod(order),
          operatorWallet,
          clientWallet,
          order.profiles?.is_verified ? 'да' : 'нет',
        ]
      : Array(cols).fill('-').map((v: string, i: number) => i === 0 ? idx + 1 : v);

    r = buildTxDataRow(ws, r, values, cols, [4, 10, 24, 13, 8, 24, 18, 14, 12, 24, 24, 7]);
  }

  const sellTotalKgs = sellOrders.reduce((s, o) => s + o.amount_kgs, 0);
  r = buildTxTotalRow(ws, r, cols, { volumeKgs: sellTotalKgs, count: sellOrders.length });
  addSignatureBlock(ws, r, settings?.director_short || '________________', 3, 5);
};

// === Sheet 5: Приложение 5/о — Покупка ВА (12 columns) ===

export const buildBuySheet = (
  wb: ExcelJS.Workbook,
  settings: CompanySettings | null,
  buyOrders: OrderData[]
) => {
  const ws = wb.addWorksheet('Приложение 5-о');
  applyPrintSetup(ws);

  ws.columns = [
    { width: 4 },   // A - №
    { width: 10 },  // B - Дата сделки
    { width: 24 },  // C - ФИО/ИНН клиента
    { width: 13 },  // D - Резидент/нерезидент
    { width: 8 },   // E - Наименование ВА
    { width: 24 },  // F - Курс обмена
    { width: 18 },  // G - Объём (иностр. валюта)
    { width: 14 },  // H - Объём (сомы)
    { width: 12 },  // I - Метод расчета
    { width: 24 },  // J - Кошелёк оператора
    { width: 24 },  // K - Кошелёк клиента
    { width: 7 },   // L - KYC
  ];

  const cols = 12;
  addPageHeader(ws, 5, 'Приложение 5/о', cols);

  let r = 3;
  ws.mergeCells(r, 1, r, cols);
  ws.getCell(r, 1).value = 'Отчет по покупке виртуальных активов клиентами';
  ws.getCell(r, 1).font = subtitleFont;
  ws.getCell(r, 1).alignment = { horizontal: 'center', wrapText: true };
  r++;

  const headers = [
    '№',
    'Дата сделки',
    'Наименование и ИНН (для юридического лица) или Ф.И.О. и ID (для физического лица) клиента',
    'Резидент/нерезидент Кыргызской Республики',
    'Наименование виртуального актива',
    'Курс обмена ВА на денежные средства',
    'Объём в денежных средствах (в инностранной валюте)',
    'Объём в денежных средств (в сомах)',
    'Метод расчета (наличный/безналичный)',
    'Адрес электронного кошелька оператора',
    'Адрес электронного кошелька клиента',
    'Идентификация клиента KYC (да/нет)',
  ];

  r = buildTxHeaders(ws, r, headers);

  const dataOrders = buyOrders.length > 0 ? buyOrders : [];
  const totalDataRows = Math.max(dataOrders.length, 4);
  const operatorWallet = getOperatorWallet(settings?.manual_wallet_address);

  for (let idx = 0; idx < totalDataRows; idx++) {
    const order = dataOrders[idx];
    const paymentMethod = order ? (getBankFromNotes(order.notes) || getPaymentMethod(order)) : '-';
    const values = order
      ? [
          idx + 1,
          format(new Date(order.created_at), 'dd.MM.yyyy'),
          formatClientName(order),
          getResidencyStatus(order.kyc_country || null, order.is_resident ?? null),
          order.to_currency,
          formatRate(order.from_currency, order.to_currency, order.rate),
          `${order.from_amount.toLocaleString('ru-RU')} ${order.from_currency}`,
          order.amount_kgs > 0 ? order.amount_kgs.toLocaleString('ru-RU') : '-',
          paymentMethod,
          operatorWallet,
          order.wallet_address || '-',
          order.profiles?.is_verified ? 'да' : 'нет',
        ]
      : Array(cols).fill('-').map((v: string, i: number) => i === 0 ? idx + 1 : v);

    r = buildTxDataRow(ws, r, values, cols, [4, 10, 24, 13, 8, 24, 18, 14, 12, 24, 24, 7]);
  }

  const buyTotalKgs = buyOrders.reduce((s, o) => s + o.amount_kgs, 0);
  r = buildTxTotalRow(ws, r, cols, { volumeKgs: buyTotalKgs, count: buyOrders.length });
  addSignatureBlock(ws, r, settings?.director_short || '________________', 4, 5);
};

// === Sheet 6: Приложение 6/о — Обмен ВА на ВА (20 columns, two-level headers) ===

export const buildExchangeSheet = (
  wb: ExcelJS.Workbook,
  settings: CompanySettings | null,
  exchangeOrders: OrderData[],
  liquidityProvider?: LiquidityProvider
) => {
  const ws = wb.addWorksheet('Приложение 6-о');
  applyPrintSetup(ws);

  // 20 columns - ultra compact for A4 landscape
  ws.columns = [
    { width: 3 },   // A - №
    { width: 8 },   // B - Дата
    { width: 5 },   // C - ВА1
    { width: 5 },   // D - ВА2
    { width: 16 },  // E - Участник 1
    { width: 16 },  // F - Участник 2
    { width: 9 },   // G - Рез. 1
    { width: 9 },   // H - Рез. 2
    { width: 9 },   // I - Курс ВА1
    { width: 9 },   // J - Курс ВА2
    { width: 11 },  // K - Объем ВА1 (иностр.)
    { width: 9 },   // L - Объем ВА1 (сомы)
    { width: 11 },  // M - Объем ВА2 (иностр.)
    { width: 9 },   // N - Объем ВА2 (сомы)
    { width: 13 },  // O - Кошелёк опер. 1
    { width: 13 },  // P - Кошелёк опер. 2
    { width: 13 },  // Q - Кошелёк кл. 1
    { width: 13 },  // R - Кошелёк кл. 2
    { width: 5 },   // S - KYC 1
    { width: 5 },   // T - KYC 2
  ];

  const cols = 20;
  addPageHeader(ws, 6, 'Приложение 6/о', cols);

  let r = 3;
  ws.mergeCells(r, 1, r, cols);
  ws.getCell(r, 1).value = 'Отчет по обмену виртуальных активов на виртуальные активы';
  ws.getCell(r, 1).font = subtitleFont;
  ws.getCell(r, 1).alignment = { horizontal: 'center', wrapText: true };
  r++;

  // === Two-level headers ===
  const topRow = r;
  const subRow = r + 1;

  const mergedHeaders: [number, number, string][] = [
    [1, 1, '№'],
    [2, 2, 'Дата сделки'],
    [3, 4, 'Наименование виртуальных активов'],
    [5, 6, 'Наименование и ИНН (для юр. лица) или Ф.И.О. и ID (для физ. лица) клиента'],
    [7, 8, 'Резидент/нерезидент КР'],
    [9, 10, 'Курсы обмена на денежные средства'],
    [11, 12, 'Объем обмена ВА1'],
    [13, 14, 'Объем обмена ВА2'],
    [15, 16, 'Адрес эл. кошелька оператора'],
    [17, 18, 'Адрес эл. кошелька клиента'],
    [19, 20, 'KYC (да/нет)'],
  ];

  mergedHeaders.forEach(([startCol, endCol, text]) => {
    if (startCol === endCol) {
      ws.mergeCells(topRow, startCol, subRow, endCol);
    } else {
      ws.mergeCells(topRow, startCol, topRow, endCol);
    }
    const cell = ws.getCell(topRow, startCol);
    cell.value = text;
    cell.font = compactHeaderFont;
    cell.alignment = headerAlignment;
    cell.border = thinBorder;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
  });

  const subHeaders: [number, string][] = [
    [3, 'ВА1'],
    [4, 'ВА2'],
    [5, 'Участника 1'],
    [6, 'Участника 2'],
    [7, 'Участника 1'],
    [8, 'Участника 2'],
    [9, 'ВА1'],
    [10, 'ВА2'],
    [11, 'в иностр. валюте'],
    [12, 'в сомах'],
    [13, 'в иностр. валюте'],
    [14, 'в сомах'],
    [15, 'Участника 1'],
    [16, 'Участника 2'],
    [17, 'Участника 1'],
    [18, 'Участника 2'],
    [19, 'Уч. 1'],
    [20, 'Уч. 2'],
  ];

  subHeaders.forEach(([col, text]) => {
    const cell = ws.getCell(subRow, col);
    cell.value = text;
    cell.font = compactHeaderFont;
    cell.alignment = headerAlignment;
    cell.border = thinBorder;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
  });

  ws.getRow(topRow).height = 50;
  ws.getRow(subRow).height = 25;

  for (let c = 1; c <= cols; c++) {
    ws.getCell(topRow, c).border = thinBorder;
    ws.getCell(subRow, c).border = thinBorder;
  }

  r = subRow + 1;

  const dataOrders = exchangeOrders.length > 0 ? exchangeOrders : [];
  const totalDataRows = Math.max(dataOrders.length, 4);
  const operatorWallet = getOperatorWallet(settings?.manual_wallet_address);
  const lpName = liquidityProvider?.name || settings?.liquidity_provider_name || '-';
  const lpInn = liquidityProvider?.inn || settings?.liquidity_provider_inn || '';
  const lpResidency = liquidityProvider?.residency || settings?.liquidity_provider_residency || 'резидент КР';
  const lpWallet = liquidityProvider?.wallet || settings?.liquidity_provider_wallet || '-';
  const participant2 = lpInn ? `${lpName} (ИНН: ${lpInn})` : lpName;

  for (let idx = 0; idx < totalDataRows; idx++) {
    const order = dataOrders[idx];
    const row = ws.getRow(r);
    const exchangeColWidths = [3, 8, 5, 5, 16, 16, 9, 9, 9, 9, 11, 9, 11, 9, 13, 13, 13, 13, 5, 5];

    // ГСФР 6/о требует объёмы в сомах для обеих сторон. amount_kgs обычно
    // фиксирует объём операции по первой ноге (ВА1). Для ВА2 берём нетто
    // — вычитаем комиссию пропорционально fee/from_amount.
    let va1Kgs = 0;
    let va2Kgs = 0;
    if (order) {
      va1Kgs = order.amount_kgs;
      const fee = (order as { fee?: number }).fee ?? 0;
      const feeKgs = fee > 0 && order.from_amount > 0
        ? va1Kgs * (fee / order.from_amount)
        : 0;
      va2Kgs = Math.max(0, va1Kgs - feeKgs);
    }

    const values = order
      ? [
          idx + 1,
          format(new Date(order.created_at), 'dd.MM.yyyy'),
          order.from_currency,
          order.to_currency,
          formatClientName(order),
          participant2,
          getResidencyStatus(order.kyc_country || null, order.is_resident ?? null),
          lpResidency,
          order.rate.toFixed(6),
          '1',
          order.from_amount.toString(),
          va1Kgs > 0 ? va1Kgs.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) : '-',
          order.to_amount.toString(),
          va2Kgs > 0 ? va2Kgs.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) : '-',
          operatorWallet,
          lpWallet,
          order.wallet_address || '-',
          lpWallet,
          order.profiles?.is_verified ? 'да' : 'нет',
          'да',
        ]
      : Array(cols).fill('-').map((v: string, i: number) => i === 0 ? idx + 1 : v);

    values.forEach((v, i) => {
      const cell = row.getCell(i + 1);
      cell.value = v;
      cell.font = compactDataFont;
      cell.alignment = { ...headerAlignment };
      cell.border = thinBorder;
    });
    row.height = estimateRowHeight(values, exchangeColWidths, 7);
    r++;
  }

  // Итого
  const totalRow = ws.getRow(r);
  const exchangeTotalKgs = exchangeOrders.reduce((s, o) => s + o.amount_kgs, 0);

  const totals: (string | number)[] = ['Итого', '', ...Array(18).fill('-')];
  // Column 12 (index 11) = Объем ВА1 в сомах, Column 14 (index 13) = Объем ВА2 в сомах
  if (exchangeTotalKgs > 0) {
    totals[11] = exchangeTotalKgs.toLocaleString('ru-RU');
    totals[13] = exchangeTotalKgs.toLocaleString('ru-RU');
  }
  totals.forEach((v, i) => {
    const cell = totalRow.getCell(i + 1);
    cell.value = v;
    cell.font = { ...compactDataFont, bold: true };
    cell.alignment = { ...headerAlignment };
    cell.border = thinBorder;
  });
  r += 2;

  addSignatureBlock(ws, r, settings?.director_short || '________________', 2, 5);
};