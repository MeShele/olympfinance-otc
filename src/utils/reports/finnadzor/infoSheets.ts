import ExcelJS from 'exceljs';
import { CompanySettings } from '@/hooks/useCompanySettings';
import { ComplianceData } from '@/hooks/useComplianceData';
import {
  OrderData,
  CurrencyInfo,
  applyPrintSetup,
  applyHeaderStyle,
  applyDataStyle,
  applyLeftDataStyle,
  addPageHeader,
  leftAlignment,
  addSignatureBlock,
  subtitleFont,
  dataFont,
  headerFont,
  smallFont,
  thinBorder,
  getTransactionType,
  estimateRowHeight,
  COUNTRY_KEYS,
  mapCountryToColumn,
} from './styles';

// === Sheet 1: Приложение 1/о — Общие сведения ===

/** Format bank accounts from fiat currencies for report line 9 (local) and 10 (foreign) */
/** Parse bank_accounts — handles both object and JSON string */
const parseBankAccounts = (ba: any): any => {
  if (!ba) return null;
  if (typeof ba === 'string') {
    try { return JSON.parse(ba); } catch { return null; }
  }
  return ba;
};

const aggregateBankAccounts = (currencies: CurrencyInfo[]): { local: string; foreign: string } => {
  const localParts: string[] = [];
  const foreignParts: string[] = [];

  const fmtBank = (b: { bank_name?: string; account_number?: string; swift?: string; bik?: string }): string => {
    const lines: string[] = [];
    if (b.bank_name) lines.push(b.bank_name);
    if (b.account_number) lines.push(`р/с ${b.account_number}`);
    if (b.swift) lines.push(`SWIFT: ${b.swift}`);
    if (b.bik) lines.push(`БИК: ${b.bik}`);
    return lines.join(', ');
  };

  currencies
    .filter(c => c.type === 'fiat' && c.bank_accounts)
    .forEach(c => {
      const ba = parseBankAccounts(c.bank_accounts);
      if (!ba) return;
      // Primary local account — use ba.local if structured, else try ba directly
      const localBank = ba.local || (ba.bank_name ? ba : null);
      const primary = localBank ? fmtBank(localBank) : '';
      if (primary) localParts.push(`${c.code}: ${primary}`);
      // Extra local accounts
      ba.extra_banks?.forEach(b => {
        const line = fmtBank(b);
        if (line) localParts.push(`${c.code}: ${line}`);
      });

      // Primary foreign account
      if (ba.foreign && (ba.foreign.bank_name || ba.foreign.account_number)) {
        const line = fmtBank(ba.foreign);
        if (line) foreignParts.push(`${c.code}: ${line}`);
      }
      // Extra foreign accounts
      ba.extra_foreign?.forEach(b => {
        const line = fmtBank(b);
        if (line) foreignParts.push(`${c.code}: ${line}`);
      });
    });

  const eWalletParts: string[] = [];
  currencies
    .filter(c => c.type === 'fiat' && c.bank_accounts)
    .forEach(c => {
      const ba = parseBankAccounts(c.bank_accounts);
      if (!ba?.e_wallets) return;
      ba.e_wallets.forEach((w: any) => {
        const bankSuffix = w.bank ? ` (${w.bank})` : '';
        eWalletParts.push(`${c.code}: ${w.system} №${w.number}${bankSuffix}`);
      });
    });

  return {
    local: localParts.join('\n') || '-',
    foreign: foreignParts.join('\n') || '-',
    eWallets: eWalletParts.join('\n') || '-',
  };
};

export const buildApp1Sheet = (
  wb: ExcelJS.Workbook,
  settings: CompanySettings | null,
  compliance: ComplianceData | null,
  currencies: CurrencyInfo[] = []
) => {
  const ws = wb.addWorksheet('Приложение 1-о');
  applyPrintSetup(ws);
  ws.columns = [
    { width: 6 },   // A - № (compact)
    { width: 80 },  // B - Наименование показателя
    { width: 55 },  // C - Расшифровка
  ];

  addPageHeader(ws, 1, 'Приложение 1/о', 3);

  let r = 3;
  ws.mergeCells(r, 1, r, 3);
  ws.getCell(r, 1).value = 'Ежемесячный оперативный отчет операторов обмена виртуальных активов';
  ws.getCell(r, 1).font = subtitleFont;
  ws.getCell(r, 1).alignment = { horizontal: 'center', wrapText: true };
  r++;

  ws.mergeCells(r, 1, r, 3);
  ws.getCell(r, 1).value = 'Общие сведения';
  ws.getCell(r, 1).font = subtitleFont;
  ws.getCell(r, 1).alignment = { horizontal: 'center' };
  r++;

  const hr = ws.getRow(r);
  hr.height = 20;
  ['№', 'Наименование показателя', 'Расшифровка'].forEach((h, i) => {
    const cell = hr.getCell(i + 1);
    cell.value = h;
    applyHeaderStyle(cell);
  });
  r++;

  const s = settings;
  const { local: bankDetailsFromCurrencies, foreign: foreignFromCurrencies, eWallets: eWalletsFromCurrencies } = aggregateBankAccounts(currencies);

  const items: [string, string, string][] = [
    ['1', 'Наименование субъекта', s?.company_name || ''],
    ['2', 'Номер и дата выдачи лицензии', s?.license_number ? `${s.license_number} от ${s.license_date}` : ''],
    ['3', 'Местонахождение', s?.legal_address || ''],
    ['4', 'Идентификационный налоговый номер (ИНН) налогоплательщика', s?.inn || ''],
    ['5', 'Управление ГНС', s?.tax_office || ''],
    ['6', 'Контактная информация поставщиков услуг виртуальных активов', '-'],
    ['6.1.', 'телефон', s?.phone || ''],
    ['6.2.', 'e-mail', s?.email || ''],
    ['6.3.', 'веб-сайт', s?.website || ''],
    ['7', 'Руководитель (ФИО)', s?.director_name || ''],
    ['7.1.', 'Контактные данные руководителя,\nмобильный телефон, e-mail', s?.director_phone || ''],
    ['8', 'Главный бухгалтер (ФИО/ наименование организации, оказывающей услуги по ведению бухгалтерского учета и составлению отчетности)', s?.accountant_name || '-'],
    ['8.1.', 'Контактные данные главного бухгалтера/организации, оказывающей услуги по ведению бухгалтерского учета и составлению отчетности: мобильный телефон, e-mail', s?.accountant_phone || '-'],
    ['9', 'Текущие расчетные счета. Банковские реквизиты: наименование, адрес банка, № расчетного (текущего) счета, МФО банка', bankDetailsFromCurrencies],
    ['10', 'Счета за границей. Наименование, адрес банка и иной кредитно-финансовой организации, созданной в соответствии с законодательством иностранного государства, с местом нахождения за пределами КР; номер счета, дата открытия счета, тип счета, вид валюты', foreignFromCurrencies],
    ['11', 'Электронные кошельки: № электронного кошелька, валюта, наименование системы электронных денег, реквизиты банка, в котором открыт электронный кошелек', eWalletsFromCurrencies],
    ['12', 'Учредители (участники). Наименование/ФИО учредителей (участников), размеры долей (количество акций), контактная информация (телефон, e-mail)', s?.founders || ''],
    ['13', 'Бенефициары. ФИО, мобильный телефон, e-mail бенефициарных владельцев (физическое лицо, которое является собственником имущества, либо владеет не менее чем 10 процентами акций (долей в уставном фонде, паев), либо прямо или косвенно (через третьих лиц) в конечном итоге имеет право или возможность давать обязательные для указания, влиять на принимаемые им решения или иным образом контролировать его действия)', s?.beneficiaries || ''],
    ['14', 'Наименования, местонахождения обособленных структурных подразделений (филиалов, представительств, территориально обособленных подразделений)', s?.branches || '-'],
    ['15', 'Наименования, местонахождения юридических лиц, учредителем (участником, акционером) которых является поставщик услуг виртуальных активов, с указанием его доли в уставном фонде', s?.subsidiaries || '-'],
    ['16', 'Дата (даты) государственной регистрации изменений и (или) дополнений, внесенных в отчетном периоде в учредительные документы (свидетельство о государственной регистрации)', compliance?.state_registration_changes || '-'],
    ['17', 'Сведения о реорганизации в отчетном периоде: форма реорганизации, дата государственной регистрации вновь возникшего юридического лица, изменений и (или) дополнений, внесенных в учредительные документы в связи с реорганизацией', compliance?.reorganization_info || '-'],
  ];

  const colWidths = [6, 80, 55];
  items.forEach(([num, label, value]) => {
    const row = ws.getRow(r);
    const cell0 = row.getCell(1);
    cell0.value = num;
    applyDataStyle(cell0);

    const cell1 = row.getCell(2);
    cell1.value = label;
    applyLeftDataStyle(cell1);

    const cell2 = row.getCell(3);
    cell2.value = value;
    applyLeftDataStyle(cell2);

    row.height = estimateRowHeight([num, label, value], colWidths, 10);
    r++;
  });

  r += 2;
  addSignatureBlock(ws, r, s?.director_short || '________________', 2, 3);
};

// === Sheet 2: Приложение 2/о — Общие сведения по деятельности ===

export const buildApp2Sheet = (
  wb: ExcelJS.Workbook,
  settings: CompanySettings | null,
  filteredOrders: OrderData[],
  currencies: CurrencyInfo[],
  totalClients: number,
  totalKycApproved: number,
  compliance: ComplianceData | null
) => {
  const ws = wb.addWorksheet('Приложение 2-о');
  applyPrintSetup(ws);
  ws.columns = [
    { width: 6 },   // A - №
    { width: 70 },  // B - Наименование
    { width: 22 },  // C - Расшифровка
  ];

  addPageHeader(ws, 2, 'Приложение 2/о', 3);

  let r = 3;
  ws.mergeCells(r, 1, r, 3);
  ws.getCell(r, 1).value = 'Общие сведения по деятельности';
  ws.getCell(r, 1).font = subtitleFont;
  ws.getCell(r, 1).alignment = { horizontal: 'center' };
  r++;

  const hr = ws.getRow(r);
  hr.height = 20;
  ['№', 'Наименование показателя', 'Расшифровка'].forEach((h, i) => {
    const cell = hr.getCell(i + 1);
    cell.value = h;
    applyHeaderStyle(cell);
  });
  r++;

  const activeClients = new Set(filteredOrders.map(o => o.profiles?.email).filter(Boolean)).size;
  const totalTransactions = filteredOrders.length;

  const sellOrders = filteredOrders.filter(o => getTransactionType(o.from_currency, o.to_currency, currencies) === 'sell');
  const buyOrders = filteredOrders.filter(o => getTransactionType(o.from_currency, o.to_currency, currencies) === 'buy');
  const exchangeOrders = filteredOrders.filter(o => getTransactionType(o.from_currency, o.to_currency, currencies) === 'exchange');

  const sellVolumeKgs = sellOrders.reduce((s, o) => s + o.amount_kgs, 0);
  const buyVolumeKgs = buyOrders.reduce((s, o) => s + o.amount_kgs, 0);
  const exchangeVolumeKgs = exchangeOrders.reduce((s, o) => s + o.amount_kgs, 0);
  const totalVolumeKgs = sellVolumeKgs + buyVolumeKgs + exchangeVolumeKgs;

  const fmtNum = (n: number) => n > 0 ? n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0';

  const items: [string, string, string | number][] = [
    ['1', 'Финансовые показатели:', ''],
    ['1.1', 'Совокупные активы', fmtNum(compliance?.total_assets || 0)],
    ['1.2', 'Совокупный собственный капитал', fmtNum(compliance?.total_equity || 0)],
    ['1.3', 'Обязательства', fmtNum(compliance?.total_liabilities || 0)],
    ['1.4', 'Чистая прибыль', fmtNum(compliance?.net_profit || 0)],
    ['1.5', 'Уплаченные налоги по видам (сумма, дата, назначение платежа)', fmtNum(compliance?.taxes_paid || 0)],
    ['1.6', 'Уставный капитал', fmtNum(settings?.charter_capital || 0)],
    ['2', 'Количество клиентов:', totalClients.toString()],
    ['2.1', 'Физические лица', totalClients.toString()],
    ['2.2', 'Юридические лица', '0'],
    ['2.3', 'Количество активных клиентов', activeClients.toString()],
    ['3', 'Общий количество транзакций (сделок)', totalTransactions.toString()],
    ['4', 'Общий объем операций (сделок) по видам оказываемых услуг/сделок (в сомах):', totalVolumeKgs > 0 ? totalVolumeKgs.toLocaleString('ru-RU', { minimumFractionDigits: 2 }) : '0'],
    ['4.1', 'Покупка виртуальных активов', buyVolumeKgs > 0 ? buyVolumeKgs.toLocaleString('ru-RU', { minimumFractionDigits: 2 }) : '0'],
    ['4.2', 'Продажа виртуальных активов', sellVolumeKgs > 0 ? sellVolumeKgs.toLocaleString('ru-RU', { minimumFractionDigits: 2 }) : '0'],
    ['4.3', 'Обмен между виртуальными активами;', exchangeVolumeKgs > 0 ? exchangeVolumeKgs.toLocaleString('ru-RU', { minimumFractionDigits: 2 }) : '0'],
    ['5', 'Внутренний контроль', ''],
    ['5.1', 'Количество проверенных клиентов (KYC)', totalKycApproved.toString()],
    ['5.2', 'Количество отказов по AML', (compliance?.aml_rejections || 0).toString()],
    ['5.3', 'Количество подозрительных операций', (compliance?.suspicious_reports || 0).toString()],
    ['5.4', 'Количество сообщений в ГСФР', (compliance?.gsfr_reports || 0).toString()],
  ];

  const colWidths2 = [6, 70, 22];
  items.forEach(([num, label, value]) => {
    const row = ws.getRow(r);
    const cell0 = row.getCell(1);
    cell0.value = num;
    applyDataStyle(cell0);

    const cell1 = row.getCell(2);
    cell1.value = label;
    applyLeftDataStyle(cell1);

    const cell2 = row.getCell(3);
    cell2.value = value;
    applyDataStyle(cell2);

    row.height = estimateRowHeight([num, label, String(value)], colWidths2, 10);
    r++;
  });

  r += 2;
  addSignatureBlock(ws, r, settings?.director_short || '________________', 2, 3);
};

// === Sheet 3: Приложение 3/о — Информация по нерезидентам ===

export const buildApp3Sheet = (
  wb: ExcelJS.Workbook,
  settings: CompanySettings | null,
  allOrders: OrderData[],
  filteredOrders: OrderData[]
) => {
  const ws = wb.addWorksheet('Приложение 3-о');
  applyPrintSetup(ws);
  ws.columns = [
    { width: 4 },   // A - №
    { width: 28 },  // B - label
    { width: 16 },  // C - sub-label
    { width: 8 },   // D - spacer
    { width: 12 },  // E - РФ
    { width: 12 },  // F - РК
    { width: 12 },  // G - РТ (Таджикистан)
    { width: 12 },  // H - РТ (Туркменистан)
    { width: 8 },   // I - КНР
    { width: 8 },   // J - США
    { width: 12 },  // K - ЕС
    { width: 10 },  // L - другие
  ];

  const cols = 12;
  addPageHeader(ws, 3, 'Приложение 3/о', cols);

  let r = 3;
  ws.mergeCells(r, 1, r, cols);
  ws.getCell(r, 1).value = 'Информация по нерезидентам';
  ws.getCell(r, 1).font = subtitleFont;
  ws.getCell(r, 1).alignment = { horizontal: 'left' };
  r++;

  // Country headers - row 1 (short names)
  const countryShort = ['', '', '', '', 'РФ', 'РК', 'РТ', 'РТ', 'КНР', 'США', 'ЕС', 'другие'];
  const cRow = ws.getRow(r);
  
  countryShort.forEach((v, i) => {
    const cell = cRow.getCell(i + 1);
    cell.value = v;
    cell.font = headerFont;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    if (i >= 4) cell.border = thinBorder;
  });
  r++;

  // Country headers - row 2 (full names)
  const countryFull = ['', '', '', '', '(Россия)', '(Казахстан)', '(Таджикистан)', '(Туркменистан)', '', '', '', ''];
  const cRow2 = ws.getRow(r);
  
  countryFull.forEach((v, i) => {
    const cell = cRow2.getCell(i + 1);
    cell.value = v;
    cell.font = smallFont;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    if (i >= 4) cell.border = thinBorder;
  });
  r++;

  // Calculate non-resident data
  const getNonResidentsByCountry = (orders: OrderData[]) => {
    const userCountryMap = new Map<string, string>();
    orders.forEach(o => {
      if (o.profiles?.email && o.kyc_country && o.kyc_country !== 'KGZ') {
        const mapped = mapCountryToColumn(o.kyc_country);
        if (mapped) userCountryMap.set(o.profiles.email, mapped);
      }
    });

    const counts: Record<string, number> = {};
    COUNTRY_KEYS.forEach(k => { counts[k] = 0; });
    userCountryMap.forEach(country => { counts[country] = (counts[country] || 0) + 1; });
    return counts;
  };

  const allNonRes = getNonResidentsByCountry(allOrders.filter(o => o.status === 'completed'));
  const periodNonRes = getNonResidentsByCountry(filteredOrders);

  const firstOrderByUser = new Map<string, string>();
  allOrders
    .filter(o => o.status === 'completed')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .forEach(o => {
      if (o.profiles?.email && !firstOrderByUser.has(o.profiles.email)) {
        firstOrderByUser.set(o.profiles.email, o.created_at);
      }
    });

  const newNonRes: Record<string, number> = {};
  COUNTRY_KEYS.forEach(k => { newNonRes[k] = 0; });
  const seenNewUsers = new Set<string>();
  filteredOrders.forEach(o => {
    if (o.profiles?.email && o.kyc_country && o.kyc_country !== 'KGZ') {
      if (seenNewUsers.has(o.profiles.email)) return;
      const first = firstOrderByUser.get(o.profiles.email);
      if (first) {
        const firstDate = new Date(first);
        const periodStart = new Date(filteredOrders[0]?.created_at || '');
        if (firstDate.getMonth() === periodStart.getMonth() && firstDate.getFullYear() === periodStart.getFullYear()) {
          const mapped = mapCountryToColumn(o.kyc_country);
          if (mapped) {
            newNonRes[mapped] = (newNonRes[mapped] || 0) + 1;
            seenNewUsers.add(o.profiles.email);
          }
        }
      }
    }
  });

  const writeCountryRow = (label1: string, label2: string, label3: string, data: Record<string, number>) => {
    const row = ws.getRow(r);
    
    row.getCell(1).value = label1;
    row.getCell(1).font = dataFont;
    row.getCell(1).border = thinBorder;
    row.getCell(2).value = label2;
    row.getCell(2).font = dataFont;
    row.getCell(2).alignment = leftAlignment;
    row.getCell(2).border = thinBorder;
    row.getCell(3).value = label3;
    row.getCell(3).font = dataFont;
    row.getCell(3).alignment = leftAlignment;
    row.getCell(3).border = thinBorder;
    row.getCell(4).value = '';
    row.getCell(4).border = thinBorder;

    COUNTRY_KEYS.forEach((key, i) => {
      const cell = row.getCell(5 + i);
      cell.value = data[key] > 0 ? data[key].toString() : '-';
      applyDataStyle(cell);
    });
    r++;
  };

  writeCountryRow('1', 'Общее количество клиентов', '', allNonRes);
  writeCountryRow('', 'Из них', 'Физические лица', allNonRes);
  writeCountryRow('', '', 'Юридические лица', Object.fromEntries(COUNTRY_KEYS.map(k => [k, 0])));

  writeCountryRow('2', 'Общее количество новых клиентов', '', newNonRes);
  writeCountryRow('', 'Из них', 'Физические лица', newNonRes);
  writeCountryRow('', '', 'Юридические лица', Object.fromEntries(COUNTRY_KEYS.map(k => [k, 0])));

  r += 2;
  addSignatureBlock(ws, r, settings?.director_short || '________________', 2, 5);
};