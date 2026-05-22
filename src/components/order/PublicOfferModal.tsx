import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Shield, AlertTriangle, Clock, Loader2 } from "lucide-react";
import { useLegalPage } from "@/hooks/useLegalPages";

interface PublicOfferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
  userId?: string;
}

const OFFER_ACCEPTED_KEY = 'offer_accepted';

export const isOfferAccepted = (userId?: string): boolean => {
  if (!userId) return false;
  try {
    return localStorage.getItem(`${OFFER_ACCEPTED_KEY}_${userId}`) === 'true';
  } catch {
    return false;
  }
};

const PublicOfferModal = ({ open, onOpenChange, onAccept, userId }: PublicOfferModalProps) => {
  const [accepted, setAccepted] = useState(false);
  const { data: dbOffer, isLoading: offerLoading } = useLegalPage("offer");

  const handleAccept = () => {
    if (accepted) {
      // Remember acceptance
      if (userId) {
        try {
          localStorage.setItem(`${OFFER_ACCEPTED_KEY}_${userId}`, 'true');
        } catch { /* ignore */ }
      }
      onAccept();
      onOpenChange(false);
      setAccepted(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Публичная оферта
          </DialogTitle>
          <DialogDescription>
            Пожалуйста, ознакомьтесь с условиями предоставления услуг
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[300px] pr-4">
          {offerLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : dbOffer?.content ? (
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">{dbOffer.content}</div>
          ) : (
            <div className="space-y-4 text-sm">
              <section>
                <h3 className="font-semibold mb-2">1. Общие положения</h3>
                <p className="text-muted-foreground">
                  Настоящая Публичная оферта (далее — «Оферта») является официальным предложением
                  сервиса Olymp Finance (далее — «Сервис») заключить договор на оказание услуг по обмену
                  криптовалют и фиатных денежных средств на условиях, изложенных в настоящей Оферте.
                </p>
              </section>

              <section>
                <h3 className="font-semibold mb-2">2. Предмет договора</h3>
                <p className="text-muted-foreground">
                  Сервис предоставляет услуги по обмену криптовалют на фиатные денежные средства
                  и наоборот, а также обмену одних криптовалют на другие по курсам, установленным
                  на момент совершения операции.
                </p>
              </section>

              <section>
                <h3 className="font-semibold mb-2">3. Условия обмена</h3>
                <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Минимальные и максимальные суммы операций устанавливаются Сервисом</li>
                  <li>Курсы обмена фиксируются на момент создания заявки</li>
                  <li>Комиссия Сервиса составляет 2.5% от суммы операции</li>
                  <li>Время обработки заявки — до 30 минут</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold mb-2">4. Верификация</h3>
                <p className="text-muted-foreground">
                  Для совершения операций Пользователь обязан пройти процедуру верификации
                  личности (KYC) в соответствии с требованиями законодательства о противодействии
                  легализации доходов, полученных преступным путём (AML).
                </p>
              </section>

              <section>
                <h3 className="font-semibold mb-2">5. Ответственность</h3>
                <p className="text-muted-foreground">
                  Пользователь несёт полную ответственность за правильность указанных реквизитов
                  для получения средств. Сервис не несёт ответственности за убытки, возникшие
                  вследствие указания неверных реквизитов.
                </p>
              </section>

              <section>
                <h3 className="font-semibold mb-2">6. Риски</h3>
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-500">
                      Криптовалюты являются высокорисковым активом. Стоимость криптовалют может
                      значительно изменяться. Пользователь принимает на себя все риски, связанные
                      с волатильностью курсов.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="font-semibold mb-2">7. Заключительные положения</h3>
                <p className="text-muted-foreground">
                  Акцептом настоящей Оферты является создание заявки на обмен. Настоящая Оферта
                  вступает в силу с момента её акцепта и действует до полного исполнения сторонами
                  своих обязательств.
                </p>
              </section>
            </div>
          )}
        </ScrollArea>

        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-start gap-3">
            <Checkbox 
              id="accept-offer" 
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked === true)}
            />
            <label 
              htmlFor="accept-offer" 
              className="text-sm leading-tight cursor-pointer"
            >
              Я ознакомился(ась) с условиями Публичной оферты и принимаю их в полном объёме
            </label>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button 
              variant="gradient" 
              className="flex-1"
              disabled={!accepted}
              onClick={handleAccept}
            >
              Принять оферту
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PublicOfferModal;
