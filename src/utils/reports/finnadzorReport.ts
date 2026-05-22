import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { CompanySettings } from '@/hooks/useCompanySettings';
import { ComplianceData } from '@/hooks/useComplianceData';
import { LiquidityProvider } from '@/hooks/useLiquidityProviders';
import { OrderData, CurrencyInfo, getTransactionType, getMonthGenitive } from './finnadzor/styles';
import { buildApp1Sheet, buildApp2Sheet, buildApp3Sheet } from './finnadzor/infoSheets';
import { buildSellSheet, buildBuySheet, buildExchangeSheet } from './finnadzor/transactionSheets';

export type { OrderData, CurrencyInfo } from './finnadzor/styles';

export const generateFinnadzorReport = async (
  orders: OrderData[],
  currencies: CurrencyInfo[],
  month: Date,
  settings?: CompanySettings | null,
  totalClients?: number,
  totalKycApproved?: number,
  complianceData?: ComplianceData | null,
  liquidityProvider?: LiquidityProvider
): Promise<void> => {
  const monthName = getMonthGenitive(month);
  const year = month.getFullYear();

  // Filter completed orders for the selected month
  const filteredOrders = orders.filter(order => {
    const orderDate = new Date(order.created_at);
    return (
      order.status === 'completed' &&
      orderDate.getMonth() === month.getMonth() &&
      orderDate.getFullYear() === month.getFullYear()
    );
  });

  // Categorize
  const sellOrders = filteredOrders.filter(o =>
    getTransactionType(o.from_currency, o.to_currency, currencies) === 'sell'
  );
  const buyOrders = filteredOrders.filter(o =>
    getTransactionType(o.from_currency, o.to_currency, currencies) === 'buy'
  );
  const exchangeOrders = filteredOrders.filter(o =>
    getTransactionType(o.from_currency, o.to_currency, currencies) === 'exchange'
  );

  const workbook = new ExcelJS.Workbook();

  // Build all 6 sheets matching official template
  buildApp1Sheet(workbook, settings || null, complianceData || null, currencies);
  buildApp2Sheet(workbook, settings || null, filteredOrders, currencies, totalClients || 0, totalKycApproved || 0, complianceData || null);
  buildApp3Sheet(workbook, settings || null, orders, filteredOrders);
  buildSellSheet(workbook, settings || null, sellOrders);
  buildBuySheet(workbook, settings || null, buyOrders);
  buildExchangeSheet(workbook, settings || null, exchangeOrders, liquidityProvider);

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Отчет_Финнадзор_${monthName}_${year}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
