export type OrderType = 'buy' | 'sell' | 'exchange';

export interface KycData {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  dateOfBirth?: string;
  country?: string;
  documentType?: string;
  documentNumber?: string;
  documentSeries?: string;
  personalNumber?: string;
  issuedDate?: string;
  expiryDate?: string;
  authority?: string;
  address?: string;
  verificationMethod?: string;
  verifiedAt?: string;
}

export interface OrderData {
  id: string;
  orderNumber: string;
  createdAt: string;
  clientName: string;
  clientContact: string;
  fromAmount: number;
  fromCurrency: string;
  toAmount: number;
  toCurrency: string;
  rate: number;
  walletAddress: string;
  operatorWallet?: string;
  status: string;
  // Реальная комиссия операции из БД (orders.fee). Если задана — в PDF
  // выводим её, иначе fallback на company.feePercent * fromAmount.
  fee?: number;
  // Additional fields for detailed templates
  paymentMethod?: string;
  paymentDetails?: string;
  bankName?: string;
  cardNumber?: string;
  recipientName?: string;
  senderWallet?: string;
  networkName?: string;
  bankAccountInfo?: string;
  // KYC identity block (aggregated from kyc_verifications.ocr_data + row fields)
  kyc?: KycData;
}

export interface CompanyData {
  companyName: string;
  inn: string;
  okpo: string;
  legalAddress: string;
  website: string;
  directorShort: string;
  feePercent: number;
  // Per-tenant брендинг для PDF-чека:
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  directorName: string | null;
}

export interface RenderContext {
  pageWidth: number;
  margin: number;
  yPos: number;
}
