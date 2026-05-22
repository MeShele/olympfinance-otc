import ScrollReveal from "./ScrollReveal";

const currencies = [
  { name: "Bitcoin", code: "BTC", icon: "\u20bf", color: "from-orange-400 to-orange-600", change: "+2.4%" },
  { name: "Ethereum", code: "ETH", icon: "\u039e", color: "from-blue-400 to-purple-500", change: "+1.8%" },
  { name: "Tether", code: "USDT", icon: "\u20ae", color: "from-green-400 to-green-600", change: "0.0%" },
  { name: "USD Coin", code: "USDC", icon: "\u25c9", color: "from-blue-400 to-blue-600", change: "0.0%" },
  { name: "Solana", code: "SOL", icon: "\u25ce", color: "from-purple-400 to-pink-500", change: "+5.2%" },
  { name: "Ripple", code: "XRP", icon: "\u2715", color: "from-gray-400 to-gray-600", change: "+0.9%" },
];

const fiatCurrencies = [
  { name: "US Dollar", code: "USD", icon: "\ud83c\uddfa\ud83c\uddf8" },
  { name: "Euro", code: "EUR", icon: "\ud83c\uddea\ud83c\uddfa" },
  { name: "Russian Ruble", code: "RUB", icon: "\ud83c\uddf7\ud83c\uddfa" },
  { name: "British Pound", code: "GBP", icon: "\ud83c\uddec\ud83c\udde7" },
  { name: "Turkish Lira", code: "TRY", icon: "\ud83c\uddf9\ud83c\uddf7" },
  { name: "UAE Dirham", code: "AED", icon: "\ud83c\udde6\ud83c\uddea" },
];

const Currencies = () => {
  return (
    <section id="currencies" className="py-20 sm:py-32 bg-secondary/20 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/3 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/3 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative">
        <ScrollReveal>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              Поддерживаемые{" "}
              <span className="gradient-text">валюты</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Широкий выбор криптовалют и фиатных денег для обмена
            </p>
          </div>
        </ScrollReveal>

        {/* Crypto Currencies */}
        <div className="mb-16">
          <ScrollReveal>
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              Криптовалюты
            </h3>
          </ScrollReveal>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {currencies.map((currency, index) => (
              <ScrollReveal key={currency.code} variant="scale" delay={index * 80}>
                <div className="glass-card-interactive p-4 sm:p-6 text-center group cursor-pointer">
                  <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br ${currency.color} flex items-center justify-center text-2xl font-bold text-white group-hover:scale-110 group-hover:shadow-lg transition-all duration-500`}>
                    {currency.icon}
                  </div>
                  <div className="font-semibold">{currency.code}</div>
                  <div className="text-sm text-muted-foreground">{currency.name}</div>
                  <div className={`text-xs mt-2 font-medium ${currency.change.startsWith('+') ? 'text-green-400' : 'text-muted-foreground'}`}>
                    {currency.change}
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>

        {/* Fiat Currencies */}
        <div>
          <ScrollReveal>
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent"></span>
              Фиатные валюты
            </h3>
          </ScrollReveal>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {fiatCurrencies.map((currency, index) => (
              <ScrollReveal key={currency.code} variant="scale" delay={index * 80}>
                <div className="glass-card-interactive p-4 sm:p-6 text-center group cursor-pointer">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-secondary flex items-center justify-center text-2xl group-hover:scale-110 transition-all duration-500">
                    {currency.icon}
                  </div>
                  <div className="font-semibold">{currency.code}</div>
                  <div className="text-sm text-muted-foreground">{currency.name}</div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Currencies;
