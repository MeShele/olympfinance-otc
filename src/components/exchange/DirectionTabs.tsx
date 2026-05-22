type ExchangeDirection = "buy" | "sell" | "swap";

interface DirectionTabsProps {
  direction: ExchangeDirection;
  onChange: (direction: ExchangeDirection) => void;
}

const DirectionTabs = ({ direction, onChange }: DirectionTabsProps) => {
  const tabs: { value: ExchangeDirection; label: string }[] = [
    { value: "buy", label: "Купить" },
    { value: "sell", label: "Продать" },
    { value: "swap", label: "Обмен" },
  ];

  return (
    <div className="flex gap-1 mb-6 p-1 bg-secondary/50 rounded-xl">
      {tabs.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`flex-1 py-2.5 px-1.5 sm:px-3 rounded-lg font-semibold text-xs sm:text-sm transition-all duration-300 whitespace-nowrap min-w-0 ${
            direction === value
              ? "bg-primary text-primary-foreground shadow-lg"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

export default DirectionTabs;
