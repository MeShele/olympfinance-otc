import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useBrandingContext } from "@/contexts/BrandingContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle, MessageCircle, Mail, Clock } from "lucide-react";
import { PLATFORM_SUPPORT_EMAIL } from "@/lib/platform";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_ITEMS = [
  {
    question: "Как совершить обмен?",
    answer:
      "Выберите направление обмена (покупка, продажа или обмен), укажите сумму, пройдите верификацию KYC, заполните реквизиты и подтвердите заявку. После этого оператор обработает вашу заявку.",
  },
  {
    question: "Что такое KYC и зачем он нужен?",
    answer:
      "KYC (Know Your Customer) -- это процедура верификации личности. Она необходима для соблюдения законодательства и защиты от мошенничества. Вам нужно загрузить фото документа и селфи с ним.",
  },
  {
    question: "Сколько времени занимает обмен?",
    answer:
      "Верификация KYC обычно занимает от нескольких минут до 24 часов. После одобрения заявки обмен происходит в течение 15-60 минут в рабочее время.",
  },
  {
    question: "Какие криптовалюты поддерживаются?",
    answer:
      "Мы поддерживаем BTC, ETH, USDT, USDC, TON и SOL. Для USDT и USDC доступны сети TRC20, ERC20 и BEP20.",
  },
  {
    question: "Какая комиссия за обмен?",
    answer:
      "Комиссия сервиса отображается в виджете обмена перед созданием заявки. Она уже включена в отображаемый курс.",
  },
  {
    question: "Можно ли отменить заявку?",
    answer:
      "Заявку можно отменить, если она ещё не была обработана оператором. Свяжитесь с поддержкой через Telegram или email для отмены.",
  },
];

const Help = () => {
  const branding = useBrandingContext();
  return (
    <DashboardLayout title="Помощь" description="Часто задаваемые вопросы и поддержка">
      <div className="max-w-2xl space-y-6">
        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Часто задаваемые вопросы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {FAQ_ITEMS.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Contacts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Связаться с поддержкой
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Telegram</p>
                <a
                  href={branding.social_telegram ? `https://t.me/${branding.social_telegram.replace('@', '')}` : "https://t.me/olympfinance_support"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {branding.social_telegram || "@olympfinance_support"}
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Email</p>
                <a
                  href={`mailto:${branding.email || PLATFORM_SUPPORT_EMAIL}`}
                  className="text-sm text-primary hover:underline"
                >
                  {branding.email || PLATFORM_SUPPORT_EMAIL}
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Время работы</p>
                <p className="text-sm text-muted-foreground">
                  Пн-Пт: 09:00 - 18:00 (GMT+6)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Help;
