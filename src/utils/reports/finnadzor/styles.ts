import ExcelJS from 'exceljs';
import { isKgResident } from '@/lib/country';

// === Types ===

export interface OrderData {
  id: string;
  created_at: string;
  from_currency: string;
  to_currency: string;
  from_amount: number;
  to_amount: number;
  rate: number;
  fee: number;
  tx_hash: string | null;
  network: string | null;
  amount_kgs: number;
  wallet_address: string | null;
  contact_info: string | null;
  status: string;
  notes: string | null;
  profiles?: {
    full_name: string | null;
    email: string;
    is_verified: boolean;
  } | null;
  kyc_country?: string | null;
  document_number?: string | null;
  kyc_full_name?: string | null;
}

export interface CurrencyInfo {
  code: string;
  type: 'fiat' | 'crypto';
  bank_accounts?: {
    bank_name: string;
    account_number: string;
    swift?: string;
    bik?: string;
    extra_banks?: Array<{ bank_name: string; account_number: string; swift?: string; bik?: string }>;
    foreign?: {
      bank_name: string;
      account_number: string;
      swift?: string;
      bik?: string;
    };
    extra_foreign?: Array<{ bank_name: string; account_number: string; swift?: string; bik?: string }>;
    e_wallets?: Array<{ system: string; number: string; bank?: string }>;
  } | null;
}

// === Styles ===

export const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
};

export const headerFont: Partial<ExcelJS.Font> = { bold: true, size: 10, name: 'Times New Roman' };
export const dataFont: Partial<ExcelJS.Font> = { size: 10, name: 'Times New Roman' };
export const titleFont: Partial<ExcelJS.Font> = { bold: true, size: 12, name: 'Times New Roman' };
export const subtitleFont: Partial<ExcelJS.Font> = { bold: true, size: 11, name: 'Times New Roman' };
export const smallFont: Partial<ExcelJS.Font> = { size: 9, name: 'Times New Roman' };
export const compactHeaderFont: Partial<ExcelJS.Font> = { bold: true, size: 7, name: 'Times New Roman' };
export const compactDataFont: Partial<ExcelJS.Font> = { size: 7, name: 'Times New Roman' };

// Transaction sheet fonts (sheets 4-6): slightly larger than compact
export const txHeaderFont: Partial<ExcelJS.Font> = { bold: true, size: 8, name: 'Times New Roman' };
export const txDataFont: Partial<ExcelJS.Font> = { size: 8, name: 'Times New Roman' };

export const headerAlignment: Partial<ExcelJS.Alignment> = {
  vertical: 'middle',
  horizontal: 'center',
  wrapText: true,
};

export const dataAlignment: Partial<ExcelJS.Alignment> = {
  vertical: 'middle',
  horizontal: 'center',
  wrapText: true,
};

export const leftAlignment: Partial<ExcelJS.Alignment> = {
  vertical: 'middle',
  horizontal: 'left',
  wrapText: true,
};

// === Print Setup (A4 Landscape) ===

export const applyPrintSetup = (ws: ExcelJS.Worksheet) => {
  ws.pageSetup = {
    orientation: 'landscape',
    paperSize: 9, // A4
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.3,
      right: 0.2,
      top: 0.3,
      bottom: 0.3,
      header: 0.15,
      footer: 0.15,
    },
  };
  ws.properties.defaultRowHeight = 14;
};

// === Cell Styling ===

export const applyHeaderStyle = (cell: ExcelJS.Cell, compact = false) => {
  cell.font = compact ? compactHeaderFont : headerFont;
  cell.alignment = headerAlignment;
  cell.border = thinBorder;
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
};

export const applyTxHeaderStyle = (cell: ExcelJS.Cell) => {
  cell.font = txHeaderFont;
  cell.alignment = headerAlignment;
  cell.border = thinBorder;
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
};

export const applyDataStyle = (cell: ExcelJS.Cell, compact = false) => {
  cell.font = compact ? compactDataFont : dataFont;
  cell.alignment = dataAlignment;
  cell.border = thinBorder;
};

export const applyTxDataStyle = (cell: ExcelJS.Cell) => {
  cell.font = txDataFont;
  cell.alignment = dataAlignment;
  cell.border = thinBorder;
};

export const applyLeftDataStyle = (cell: ExcelJS.Cell, compact = false) => {
  cell.font = compact ? compactDataFont : dataFont;
  cell.alignment = leftAlignment;
  cell.border = thinBorder;
};

// === Row height estimation ===

/** Estimate row height based on longest cell text vs column width.
 *  charWidth ≈ font-size-dependent chars per Excel width unit. */
export const estimateRowHeight = (
  values: (string | number | null | undefined)[],
  colWidths: number[],
  baseFontSize: number = 10,
  minHeight: number = 16,
  lineHeightPt: number = 14
): number => {
  // Times New Roman Cyrillic: ~1 char per Excel width unit at 10pt, ~1.5 at 7-8pt
  const charsPerUnit = baseFontSize <= 8 ? 1.5 : 1.0;
  let maxLines = 1;
  values.forEach((val, i) => {
    if (val == null) return;
    const text = String(val);
    const colW = colWidths[i] || 10;
    const maxChars = Math.max(1, Math.floor(colW * charsPerUnit));
    const paragraphs = text.split('\n');
    let lines = 0;
    paragraphs.forEach(p => {
      lines += Math.max(1, Math.ceil(p.length / maxChars));
    });
    if (lines > maxLines) maxLines = lines;
  });
  // Add small padding (1 extra line height) for breathing room
  const estimated = maxLines * lineHeightPt + 4;
  return Math.max(minHeight, estimated);
};

// === Helpers ===

export const getTransactionType = (
  fromCurrency: string,
  toCurrency: string,
  currencies: CurrencyInfo[]
): 'sell' | 'buy' | 'exchange' => {
  const fromType = currencies.find(c => c.code === fromCurrency)?.type;
  const toType = currencies.find(c => c.code === toCurrency)?.type;
  if (fromType === 'crypto' && toType === 'fiat') return 'sell';
  if (fromType === 'fiat' && toType === 'crypto') return 'buy';
  return 'exchange';
};

export const formatClientName = (order: OrderData): string => {
  const name = order.profiles?.full_name || order.kyc_full_name || 'Не указано';
  const docNum = order.document_number;
  if (docNum) {
    return `${name} (Док: ${docNum})`;
  }
  return name;
};

/**
 * Метод расчёта для Приложений 4/о, 5/о (колонка 9).
 *
 * Приоритет:
 *   1. order.payment_method (структурированное поле, заполняется через
 *      форму заказа с RES-фичи).
 *   2. order.notes.paymentMethod (legacy: парсим из JSON).
 *   3. fallback 'безналичный'.
 */
export const getPaymentMethod = (
  notesOrOrder: string | null | { payment_method?: string | null; notes?: string | null },
): string => {
  // Новый сигнатура: получили целый order
  if (notesOrOrder && typeof notesOrOrder === 'object') {
    const pm = (notesOrOrder as { payment_method?: string | null }).payment_method;
    if (pm === 'cash') return 'наличный';
    if (pm === 'cashless') return 'безналичный';
    // legacy fallback
    return parseFromNotes((notesOrOrder as { notes?: string | null }).notes ?? null);
  }
  // Legacy сигнатура: получили строку notes
  return parseFromNotes(notesOrOrder as string | null);
};

function parseFromNotes(notes: string | null): string {
  if (!notes) return 'безналичный';
  try {
    const parsed = JSON.parse(notes);
    const v = parsed.paymentMethod;
    if (v === 'cash') return 'наличный';
    return 'безналичный';
  } catch {
    return 'безналичный';
  }
}

/**
 * Резидентство для ГСФР-отчётов.
 *
 * Приоритет:
 *   1. profiles.is_resident — явный выбор клиента при регистрации
 *      (или через ResidencyGate / админом).
 *   2. fallback на kyc_country === 'KGZ' для legacy-данных, где
 *      резидентство ещё не указано.
 *   3. если ни того ни другого — считаем резидентом (консервативный
 *      default — в отчёт попадает с пометкой "резидент", потом админ
 *      исправит вручную).
 */
export const getResidencyStatus = (
  kyc_country: string | null,
  is_resident?: boolean | null,
): string => {
  if (is_resident === true) return 'резидент КР';
  if (is_resident === false) return 'нерезидент КР';
  const norm = isKgResident(kyc_country);
  if (norm === true) return 'резидент КР';
  if (norm === false) return 'нерезидент КР';
  return 'не определено'; // НЕ дефолтим в «резидент» (недо-репорт нерезидентов) — комплаенс резолвит
};

export const getMonthGenitive = (date: Date): string => {
  const months = [
    'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
    'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'
  ];
  return months[date.getMonth()];
};

/** Add page number and appendix label in top-right */
export const addPageHeader = (
  ws: ExcelJS.Worksheet,
  pageNum: number,
  label: string,
  lastCol: number
) => {
  ws.getCell(1, lastCol).value = pageNum;
  ws.getCell(1, lastCol).font = dataFont;
  ws.getCell(1, lastCol).alignment = { horizontal: 'right' };
  // In the official template, the label sits one column before the page number on wide sheets
  const labelCol = lastCol > 3 ? lastCol - 1 : lastCol;
  ws.getCell(2, labelCol).value = label;
  ws.getCell(2, labelCol).font = dataFont;
  ws.getCell(2, labelCol).alignment = { horizontal: 'right' };
};

/** Add signature block (Руководитель, М.П., Главный бухгалтер) */
export const addSignatureBlock = (
  ws: ExcelJS.Worksheet,
  startRow: number,
  directorShort: string,
  nameCol: number,
  signCol: number
): number => {
  let r = startRow;

  // Always merge across enough columns so "Руководитель" + name fits
  const mergeEnd = Math.max(nameCol, 2);
  ws.mergeCells(r, 1, r, mergeEnd);
  ws.getCell(r, 1).value = `Руководитель           ${directorShort}`;
  ws.getCell(r, 1).font = { ...dataFont, bold: true };
  ws.getCell(r, 1).alignment = { horizontal: 'left', wrapText: false };
  r++;

  ws.getCell(r, nameCol).value = '(фамилия, инициалы)';
  ws.getCell(r, nameCol).font = smallFont;
  ws.getCell(r, nameCol).alignment = { horizontal: 'center' };
  ws.getCell(r, signCol).value = 'подпись, печать';
  ws.getCell(r, signCol).font = smallFont;
  ws.getCell(r, signCol).alignment = { horizontal: 'center' };
  r++;

  ws.getCell(r, 1).value = 'М.П.';
  ws.getCell(r, 1).font = smallFont;
  r += 2;

  // "Главный бухгалтер" — also merge
  ws.mergeCells(r, 1, r, mergeEnd);
  ws.getCell(r, 1).value = 'Главный бухгалтер';
  ws.getCell(r, 1).font = { ...dataFont, bold: true };
  ws.getCell(r, 1).alignment = { horizontal: 'left', wrapText: false };
  r++;

  ws.getCell(r, nameCol).value = '(фамилия, инициалы)';
  ws.getCell(r, nameCol).font = smallFont;
  ws.getCell(r, nameCol).alignment = { horizontal: 'center' };
  ws.getCell(r, signCol).value = 'подпись';
  ws.getCell(r, signCol).font = smallFont;
  ws.getCell(r, signCol).alignment = { horizontal: 'center' };

  return r;
};

// === Country mapping for Приложение 3/о ===

const EU_COUNTRIES = new Set([
  'AUT', 'BEL', 'BGR', 'HRV', 'CYP', 'CZE', 'DNK', 'EST', 'FIN', 'FRA',
  'DEU', 'GRC', 'HUN', 'IRL', 'ITA', 'LVA', 'LTU', 'LUX', 'MLT', 'NLD',
  'POL', 'PRT', 'ROU', 'SVK', 'SVN', 'ESP', 'SWE',
]);

export const COUNTRY_KEYS = ['RUS', 'KAZ', 'TJK', 'TKM', 'CHN', 'USA', 'EU', 'OTHER'] as const;

export const mapCountryToColumn = (code: string | null): string => {
  if (!code || isKgResident(code) === true) return ''; // KG-резиденты исключены (нормализовано)
  if (code === 'RUS') return 'RUS';
  if (code === 'KAZ') return 'KAZ';
  if (code === 'TJK') return 'TJK';
  if (code === 'TKM') return 'TKM';
  if (code === 'CHN') return 'CHN';
  if (code === 'USA') return 'USA';
  if (EU_COUNTRIES.has(code)) return 'EU';
  return 'OTHER';
};