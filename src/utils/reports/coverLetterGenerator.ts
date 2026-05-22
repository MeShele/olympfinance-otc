import jsPDF from 'jspdf';
import { CompanySettings } from '@/hooks/useCompanySettings';

const FONT_NAME = 'Tinos'; // Times New Roman compatible, Cyrillic support

const loadFont = async (doc: jsPDF, url: string, fontName: string, style: string) => {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  const base64 = btoa(binary);
  
  doc.addFileToVFS(`${fontName}-${style}.ttf`, base64);
  doc.addFont(`${fontName}-${style}.ttf`, fontName, style);
};

/** Genitive month name (родительный падеж) */
const getMonthNameGenitive = (month: number): string => {
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];
  return months[month];
};

/** Nominative month name (именительный падеж) */
const getMonthName = (month: number): string => {
  const months = [
    'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
    'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'
  ];
  return months[month];
};

/** Number to Russian words (1–20) for attachment count */
const numberToRussianWord = (n: number): string => {
  const words = [
    '', 'один', 'два', 'три', 'четыре', 'пять',
    'шесть', 'семь', 'восемь', 'девять', 'десять',
    'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать',
    'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать', 'двадцать'
  ];
  return words[n] || String(n);
};

/** Russian plural for "лист" */
const getSheetPlural = (n: number): string => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'листов';
  if (mod10 === 1) return 'лист';
  if (mod10 >= 2 && mod10 <= 4) return 'листа';
  return 'листов';
};

export interface CoverLetterOptions {
  outgoingNumber?: string;
  outgoingDay?: string;
}

export const generateCoverLetter = async (
  settings: CompanySettings,
  month: Date,
  options?: CoverLetterOptions
): Promise<void> => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  await loadFont(doc, '/fonts/Tinos-Regular.ttf', FONT_NAME, 'normal');
  await loadFont(doc, '/fonts/Tinos-Bold.ttf', FONT_NAME, 'bold');

  const pageWidth = 210;
  const marginLeft = 30;
  const marginRight = 15;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const rightEdge = pageWidth - marginRight;
  const monthGenitive = getMonthNameGenitive(month.getMonth());
  const monthName = getMonthName(month.getMonth());
  const year = month.getFullYear();
  const companyName = settings.company_name || 'ОсОО «Корэкс»';

  let y = 20;

  // ============================================================
  // 1. ADDRESSEE — right-aligned, bold, 14pt
  // ============================================================
  doc.setFont(FONT_NAME, 'bold');
  doc.setFontSize(14);

  const addresseeLines = [
    'В Службу регулирования и надзора',
    'за финансовым рынком при Министерстве',
    'экономики и коммерции КР',
  ];
  addresseeLines.forEach((line) => {
    doc.text(line, rightEdge, y, { align: 'right' });
    y += 6;
  });

  y += 2;

  // ============================================================
  // 2. SENDER — right-aligned, bold, 14pt
  // ============================================================
  doc.text(`от: ${companyName}`, rightEdge, y, { align: 'right' });
  y += 6;

  if (settings.legal_address) {
    doc.text('Юридический адрес:', rightEdge, y, { align: 'right' });
    y += 6;
    // Wrap long addresses to fit within the right-aligned block
    const addressMaxWidth = pageWidth / 2;
    const addressLines = doc.splitTextToSize(settings.legal_address, addressMaxWidth);
    addressLines.forEach((line: string) => {
      doc.text(line, rightEdge, y, { align: 'right' });
      y += 6;
    });
  }

  if (settings.inn) {
    doc.text(`ИНН: ${settings.inn}`, rightEdge, y, { align: 'right' });
    y += 6;
  }

  if (settings.phone) {
    doc.text(`Телефон: ${settings.phone}`, rightEdge, y, { align: 'right' });
    y += 6;
  }

  if (settings.email) {
    doc.text(`E-mail: ${settings.email}`, rightEdge, y, { align: 'right' });
    y += 6;
  }

  y += 10;

  // ============================================================
  // 3. TITLE — centered, bold, 14pt
  // ============================================================
  doc.setFont(FONT_NAME, 'bold');
  doc.setFontSize(14);
  doc.text('Сопроводительное письмо', pageWidth / 2, y, { align: 'center' });
  y += 12;

  // ============================================================
  // 4. OUTGOING NUMBER — bold, 12pt (two lines)
  // ============================================================
  doc.setFont(FONT_NAME, 'bold');
  doc.setFontSize(12);
  const outNum = options?.outgoingNumber || '____';
  const outDay = options?.outgoingDay || '____';
  doc.text(`Исх. № ${outNum}`, marginLeft, y);
  y += 6;
  doc.text(`от «${outDay}» ${monthGenitive} ${year} г.`, marginLeft, y);
  y += 10;

  // ============================================================
  // 5. BODY TEXT — normal, 12pt
  // ============================================================
  doc.setFont(FONT_NAME, 'normal');
  doc.setFontSize(12);

  const bodyText = `    В соответствии с требованиями Приказа Службы регулирования и надзора за финансовым рынком при Министерстве экономики и коммерции Кыргызской Республики от 24 октября 2025 года № 579-п «Об утверждении форм отчетности поставщиков услуг виртуальных активов» и во исполнение Положения о деятельности оператора обмена виртуальных активов и ведении Реестра операторов обмена виртуальными активами, утверждённого постановлением Кабинета Министров Кыргызской Республики от 16 сентября 2022 года № 514, направляем ежемесячный оперативный отчет за ${monthName} ${year} года.`;

  const bodyLines = doc.splitTextToSize(bodyText, contentWidth);
  doc.text(bodyLines, marginLeft, y);
  y += bodyLines.length * 5 + 4;

  // ============================================================
  // 6. INTRO TO APPENDICES
  // ============================================================
  doc.text('    К отчёту прилагаются следующие документы:', marginLeft, y);
  y += 8;

  // ============================================================
  // 7. APPENDICES — numbered list with bold names and em-dash
  // ============================================================
  const appendices = [
    { name: 'Приложение 1/о', desc: '— Общие сведения;' },
    { name: 'Приложение 2/о', desc: '— Общие сведения по деятельности;' },
    { name: 'Приложение 3/о', desc: '— Информация по нерезидентам;' },
    { name: 'Приложение 4/о', desc: '— Отчет по продаже виртуальных активов клиентами;' },
    { name: 'Приложение 5/о', desc: '— Отчет по покупке виртуальных активов клиентами;' },
    { name: 'Приложение 6/о', desc: '— Отчет по обмену виртуальных активов на виртуальные активы.' },
  ];

  const listIndent = marginLeft + 5;
  const appendixCount = appendices.length;

  appendices.forEach((item, idx) => {
    const number = `${idx + 1}. `;
    const boldPart = item.name;
    const normalPart = ` ${item.desc}`;

    // Number — bold
    doc.setFont(FONT_NAME, 'bold');
    doc.setFontSize(12);
    doc.text(number, listIndent, y);
    const numberWidth = doc.getTextWidth(number);

    // Name — bold
    doc.text(boldPart, listIndent + numberWidth, y);
    const nameWidth = doc.getTextWidth(boldPart);

    // Description — normal
    doc.setFont(FONT_NAME, 'normal');
    const descX = listIndent + numberWidth + nameWidth;
    const remainingWidth = rightEdge - descX;

    const descLines = doc.splitTextToSize(normalPart, remainingWidth);
    doc.text(descLines[0], descX, y);

    if (descLines.length > 1) {
      for (let i = 1; i < descLines.length; i++) {
        y += 5;
        doc.text(descLines[i], listIndent, y);
      }
    }

    y += 6;
  });

  y += 2;

  // ============================================================
  // 8. ADDITIONAL PARAGRAPHS — normal, 12pt
  // ============================================================
  doc.setFont(FONT_NAME, 'normal');
  doc.setFontSize(12);

  const para1 = '    Все представленные документы пронумерованы, прошнурованы и скреплены подписью и печатью.';
  const para1Lines = doc.splitTextToSize(para1, contentWidth);
  doc.text(para1Lines, marginLeft, y);
  y += para1Lines.length * 5 + 4;

  const para2 = '    Просим рассмотреть предоставленные отчеты и уведомить нас в случае необходимости дополнительных разъяснений или корректировок.';
  const para2Lines = doc.splitTextToSize(para2, contentWidth);
  doc.text(para2Lines, marginLeft, y);
  y += para2Lines.length * 5 + 6;

  // ============================================================
  // 9. ATTACHMENT COUNT — centered, 12pt (dynamic)
  // ============================================================
  const countWord = numberToRussianWord(appendixCount);
  const sheetPlural = getSheetPlural(appendixCount);
  doc.text(`В приложении: ${appendixCount} (${countWord}) ${sheetPlural}.`, pageWidth / 2, y, { align: 'center' });
  y += 10;

  // ============================================================
  // 10. CLOSING — bold, 12pt
  // ============================================================
  doc.setFont(FONT_NAME, 'bold');
  doc.setFontSize(12);
  doc.text('С уважением,', marginLeft, y);
  y += 10;

  // ============================================================
  // 11. SIGNATURE BLOCK — bold, 14pt
  // ============================================================
  doc.setFont(FONT_NAME, 'bold');
  doc.setFontSize(14);

  doc.text('Генеральный директор', marginLeft, y);
  y += 6;

  doc.text(companyName, marginLeft, y);
  const signName = settings.director_short || settings.director_name || '________________';
  doc.text(signName, rightEdge, y, { align: 'right' });

  // ============================================================
  // SAVE
  // ============================================================
  doc.save(`Сопроводительное_письмо_${monthName}_${year}.pdf`);
};
