import ScrollReveal from "@/components/ScrollReveal";

const CTAMinimal = () => {
  const scrollToTop = () => {
    const el = document.getElementById("exchange");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <section className="py-20 sm:py-28">
      <div className="container mx-auto px-4 sm:px-6">
        <ScrollReveal>
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Готовы начать?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Присоединяйтесь к тысячам пользователей, которые уже обменивают криптовалюту быстро и безопасно.
            </p>
            <button
              onClick={scrollToTop}
              className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-8 py-3 text-base font-medium transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Начать обмен
            </button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default CTAMinimal;
