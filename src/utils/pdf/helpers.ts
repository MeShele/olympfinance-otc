import jsPDF from 'jspdf';
import { CRYPTO_CURRENCIES, RUSSIAN_MONTHS } from './constants';
import { OrderType } from './types';

/**
 * Determine order type based on currencies
 */
export const determineOrderType = (fromCurrency: string, toCurrency: string): OrderType => {
  const fromIsCrypto = CRYPTO_CURRENCIES.includes(fromCurrency);
  const toIsCrypto = CRYPTO_CURRENCIES.includes(toCurrency);
  
  if (!fromIsCrypto && toIsCrypto) {
    return 'buy'; // Fiat -> Crypto = Purchase VA
  } else if (fromIsCrypto && !toIsCrypto) {
    return 'sell'; // Crypto -> Fiat = Sell VA
  } else {
    return 'exchange'; // Crypto -> Crypto = Exchange VA
  }
};

/**
 * Check if currency is crypto
 */
export const isCryptoCurrency = (currency: string): boolean => {
  return CRYPTO_CURRENCIES.includes(currency);
};

/**
 * Format date in Russian format: «DD» месяц YYYY г.
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = RUSSIAN_MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `«${day}» ${month} ${year} г.`;
};

/**
 * Format date for blank template: «____» ____________ 202__ г.
 */
export const formatDateBlank = (): string => {
  return '«____» ____________ 202__ г.';
};

/**
 * Format number with proper precision for crypto/fiat
 */
export const formatNumber = (num: number, isCrypto: boolean): string => {
  if (isCrypto) {
    if (num < 0.0001) return num.toFixed(8);
    if (num < 0.01) return num.toFixed(6);
    if (num < 1) return num.toFixed(4);
    return num.toFixed(4);
  }
  return num.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Format exchange rate string
 */
export const formatRate = (rate: number, fromCurrency: string, toCurrency: string): string => {
  if (rate < 1) {
    return `1 ${fromCurrency} = ${rate.toFixed(8)} ${toCurrency}`;
  }
  return `1 ${fromCurrency} = ${rate.toFixed(4)} ${toCurrency}`;
};

/**
 * Load font and convert to base64
 */
/**
 * Load font and convert to base64 using chunked approach to avoid stack overflow
 */
const loadFontAsBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load font from ${url}: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  // Use chunked conversion to avoid call stack issues with large fonts
  const CHUNK_SIZE = 8192;
  let binary = '';
  for (let i = 0; i < uint8Array.length; i += CHUNK_SIZE) {
    const chunk = uint8Array.subarray(i, Math.min(i + CHUNK_SIZE, uint8Array.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
};

/**
 * Setup Roboto fonts for jsPDF with Cyrillic support
 */
export const setupFonts = async (doc: jsPDF): Promise<boolean> => {
  try {
    const [regularBase64, boldBase64] = await Promise.all([
      loadFontAsBase64('/fonts/Roboto-Regular.ttf'),
      loadFontAsBase64('/fonts/Roboto-Bold.ttf'),
    ]);
    
    doc.addFileToVFS('Roboto-Regular.ttf', regularBase64);
    doc.addFileToVFS('Roboto-Bold.ttf', boldBase64);
    
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
    
    // Set default font
    doc.setFont('Roboto', 'normal');
    
    console.log('Fonts loaded successfully');
    return true;
  } catch (error) {
    console.error('Failed to load Roboto fonts:', error);
    return false;
  }
};

/**
 * Generate order number from order ID and date.
 * Prefix ORD- нейтральный (без бренда платформы). Раньше был CX-, что
 * клиенты воспринимали как «CoreX»/«Корекс» — чужой бренд на их чеке.
 */
export const generateOrderNumber = (orderId: string, createdAt: string): string => {
  const date = new Date(createdAt);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const shortId = orderId.slice(0, 6).toUpperCase();
  return `ORD-${year}${month}${day}-${shortId}`;
};

/**
 * Загружает изображение по URL и возвращает base64 для jsPDF.addImage().
 * Используется и в header (большой логотип сверху), и в footer (печать).
 * Возвращает null при любой ошибке — рендер продолжается без логотипа.
 */
export const loadCompanyLogo = async (
  url: string,
): Promise<{ base64: string; format: 'PNG' | 'JPEG' } | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const contentType = response.headers.get('Content-Type') ?? '';
    const format: 'PNG' | 'JPEG' = contentType.includes('jpeg') ? 'JPEG' : 'PNG';
    const blob = await response.blob();
    const base64: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    return { base64, format };
  } catch (err) {
    console.warn('loadCompanyLogo failed:', err);
    return null;
  }
};
