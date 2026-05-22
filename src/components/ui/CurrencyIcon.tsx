import { Currency } from "@/hooks/useCurrencies";

interface CurrencyIconProps {
  currency: Currency | null | undefined;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 16,
  md: 24,
  lg: 32,
};

const cryptoIcons: Record<string, (size: number) => JSX.Element> = {
  BTC: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#F7931A" />
      <path
        d="M22.5 14.2c.3-2.1-1.3-3.2-3.4-3.9l.7-2.8-1.7-.4-.7 2.7c-.4-.1-.9-.2-1.4-.3l.7-2.7-1.7-.4-.7 2.8c-.4-.1-.7-.2-1-.2l-2.4-.6-.5 1.8s1.3.3 1.2.3c.7.2.8.6.8 1l-.8 3.3c0 0 .1 0 .2.1h-.2l-1.2 4.7c-.1.2-.3.6-.8.4 0 0-1.2-.3-1.2-.3l-.8 2 2.2.6c.4.1.8.2 1.2.3l-.7 2.8 1.7.4.7-2.8c.5.1.9.2 1.4.3l-.7 2.8 1.7.4.7-2.8c3 .6 5.2.3 6.1-2.4.8-2.1 0-3.3-1.6-4.1 1.1-.3 2-1 2.2-2.6zm-3.9 5.5c-.5 2.1-4.2 1-5.4.7l1-3.9c1.2.3 5 .9 4.4 3.2zm.6-5.5c-.5 1.9-3.5.9-4.5.7l.9-3.5c1 .3 4.2.7 3.6 2.8z"
        fill="white"
      />
    </svg>
  ),
  ETH: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#627EEA" />
      <path d="M16 4v8.9l7.5 3.3L16 4z" fill="white" fillOpacity="0.6" />
      <path d="M16 4L8.5 16.2l7.5-3.3V4z" fill="white" />
      <path d="M16 21.9v6.1l7.5-10.4L16 21.9z" fill="white" fillOpacity="0.6" />
      <path d="M16 28v-6.1l-7.5-4.3L16 28z" fill="white" />
      <path d="M16 20.6l7.5-4.4L16 12.9v7.7z" fill="white" fillOpacity="0.2" />
      <path d="M8.5 16.2l7.5 4.4v-7.7l-7.5 3.3z" fill="white" fillOpacity="0.6" />
    </svg>
  ),
  USDT: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#26A17B" />
      <path
        d="M17.9 17.1v-.002c-.1 0-.8.1-2 .1-1 0-1.7-.1-1.9-.1v.002c-3.8-.2-6.6-.9-6.6-1.7 0-.9 2.8-1.6 6.6-1.7v2.8c.3 0 1 .1 2 .1 1.2 0 1.8-.1 1.9-.1v-2.8c3.8.2 6.6.9 6.6 1.7 0 .9-2.8 1.6-6.6 1.7zm0-3.7v-2.5h5.3V7.5H8.9v3.4h5.3v2.5c-4.3.2-7.5 1.1-7.5 2.2 0 1.1 3.2 2 7.5 2.2v7.9h3.7v-7.9c4.3-.2 7.5-1.1 7.5-2.2 0-1.1-3.2-2-7.5-2.2z"
        fill="white"
      />
    </svg>
  ),
  USDC: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#2775CA" />
      <path
        d="M13.4 25.1c0 .4-.3.5-.6.4A10 10 0 016.4 16c0-3.7 2-6.9 5-8.7.2-.1.5 0 .5.3v1.3c0 .2-.1.4-.3.5a8 8 0 000 13.2c.2.1.3.3.3.5v1.3c0 .3-.2.5-.5.7zm5.8-1.4c0 .3-.2.5-.5.5h-1.4c-.3 0-.5-.2-.5-.5v-1.4c-1.8-.2-2.9-.9-3.5-2-.1-.2 0-.5.2-.6l1.3-.6c.2-.1.4 0 .5.2.4.7 1 1.1 2.2 1.1 1.5 0 2.1-.7 2.1-1.5 0-.8-.4-1.3-2.3-1.8-2.3-.6-3.7-1.3-3.7-3.3 0-1.6 1.2-2.7 3.2-3v-1.4c0-.3.2-.5.5-.5h1.4c.3 0 .5.2.5.5v1.5c1.3.2 2.2.8 2.8 1.6.1.2.1.5-.2.6l-1.2.7c-.2.1-.4.1-.5-.1-.4-.6-.9-1-1.8-1-1.3 0-1.8.6-1.8 1.3 0 .7.4 1.2 2.4 1.7 2.3.6 3.6 1.4 3.6 3.4 0 1.7-1.3 2.9-3.3 3.1v1.5zm5-7.7c0 3.7-2 6.9-5 8.7-.2.1-.5 0-.5-.3v-1.3c0-.2.1-.4.3-.5a8 8 0 000-13.2c-.2-.1-.3-.3-.3-.5V7.6c0-.3.2-.5.5-.4a10 10 0 016.4 9.5l-1.4.3z"
        fill="white"
      />
    </svg>
  ),
  SOL: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="url(#sol-grad)" />
      <defs>
        <linearGradient id="sol-grad" x1="0" y1="32" x2="32" y2="0">
          <stop stopColor="#9945FF" />
          <stop offset="1" stopColor="#14F195" />
        </linearGradient>
      </defs>
      <path
        d="M9.5 20.4a.5.5 0 01.4-.2h13.7c.2 0 .4.3.2.5l-2.3 2.3a.5.5 0 01-.4.2H7.4c-.2 0-.4-.3-.2-.5l2.3-2.3zm0-11.7a.5.5 0 01.4-.2h13.7c.2 0 .4.3.2.5l-2.3 2.3a.5.5 0 01-.4.2H7.4c-.2 0-.4-.3-.2-.5l2.3-2.3zm12.2 5.7a.5.5 0 00-.4-.2H7.6c-.2 0-.4.3-.2.5l2.3 2.3a.5.5 0 00.4.2h13.7c.2 0 .4-.3.2-.5l-2.3-2.3z"
        fill="white"
      />
    </svg>
  ),
  XRP: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#23292F" />
      <path
        d="M10.5 8h2.6l3 3.9L19.1 8h2.6l-4.4 5.6L21.7 24h-2.6l-3-4-3 4H10.5l4.4-5.6c.1-.2.2-.3.2-.4s-.1-.2-.2-.4L10.5 8z"
        fill="white"
      />
    </svg>
  ),
};

const CurrencyIcon = ({ currency, size = 'md' }: CurrencyIconProps) => {
  if (!currency) return null;

  const px = sizeMap[size];
  const textSizeClass = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-xl';

  // Admin-supplied icon URL wins over everything — lets operators pick
  // an exact logo per currency (auto-resolved via CoinGecko/flagcdn or
  // pasted by hand).
  if (currency.icon && /^https?:\/\//i.test(currency.icon)) {
    return (
      <img
        src={currency.icon}
        alt={currency.code}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: px, height: px }}
        loading="lazy"
      />
    );
  }

  // Crypto currencies with built-in SVG icons
  if (currency.type === 'crypto' && cryptoIcons[currency.code]) {
    return (
      <span className="inline-flex items-center justify-center flex-shrink-0" style={{ width: px, height: px }}>
        {cryptoIcons[currency.code](px)}
      </span>
    );
  }

  // Fallback: text glyph from currency.icon (flag emoji / symbol)
  return <span className={textSizeClass}>{currency.icon}</span>;
};

export default CurrencyIcon;
