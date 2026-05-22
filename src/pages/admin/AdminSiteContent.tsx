import { useState, useEffect } from "react";
import { Loader2, Save, Type, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOperatorId } from "@/hooks/useOperatorId";
import {
  useSiteContentAdmin,
  useSaveSiteContent,
  defaultHero,
  defaultFeatures,
  defaultStats,
  defaultCTA,
  type HeroContent,
  type FeaturesContent,
  type StatsContent,
  type CTAContent,
  type FeatureItem,
  type StatItem,
} from "@/hooks/useSiteContent";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { AdminSectionManager } from "@/components/admin/AdminSectionManager";

const ICON_OPTIONS = [
  "Shield", "Zap", "Clock", "Wallet", "Globe", "Headphones",
  "Lock", "Star", "Heart", "Award", "TrendingUp", "Users",
];

export default function AdminSiteContent() {
  const operatorId = useOperatorId();
  const { data, isLoading } = useSiteContentAdmin(operatorId);
  const { mutate: saveContent, isPending } = useSaveSiteContent();

  const [hero, setHero] = useState<HeroContent>(defaultHero);
  const [features, setFeatures] = useState<FeaturesContent>(defaultFeatures);
  const [stats, setStats] = useState<StatsContent>(defaultStats);
  const [cta, setCta] = useState<CTAContent>(defaultCTA);
  const [activeTab, setActiveTab] = useState("hero");

  useEffect(() => {
    if (!data) return;
    setHero(data.hero);
    setFeatures(data.features);
    setStats(data.stats);
    setCta(data.cta);
  }, [data]);

  const handleSaveHero = () => saveContent({ operator_id: operatorId, section: "hero", content: hero });
  const handleSaveFeatures = () => saveContent({ operator_id: operatorId, section: "features", content: features });
  const handleSaveStats = () => saveContent({ operator_id: operatorId, section: "stats", content: stats });
  const handleSaveCTA = () => saveContent({ operator_id: operatorId, section: "cta", content: cta });

  // Hero trusts helpers
  const addTrust = () => setHero((h) => ({ ...h, trusts: [...h.trusts, ""] }));
  const removeTrust = (i: number) => setHero((h) => ({ ...h, trusts: h.trusts.filter((_, idx) => idx !== i) }));
  const updateTrust = (i: number, v: string) =>
    setHero((h) => ({ ...h, trusts: h.trusts.map((t, idx) => (idx === i ? v : t)) }));

  // Feature items helpers
  const addFeature = () =>
    setFeatures((f) => ({ ...f, items: [...f.items, { title: "", description: "", icon: "Star" }] }));
  const removeFeature = (i: number) =>
    setFeatures((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateFeature = (i: number, field: keyof FeatureItem, v: string) =>
    setFeatures((f) => ({
      ...f,
      items: f.items.map((item, idx) => (idx === i ? { ...item, [field]: v } : item)),
    }));

  // Stat items helpers
  const addStat = () => setStats((s) => ({ ...s, items: [...s.items, { value: "", label: "" }] }));
  const removeStat = (i: number) => setStats((s) => ({ ...s, items: s.items.filter((_, idx) => idx !== i) }));
  const updateStat = (i: number, field: keyof StatItem, v: string) =>
    setStats((s) => ({
      ...s,
      items: s.items.map((item, idx) => (idx === i ? { ...item, [field]: v } : item)),
    }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <RequirePermission section="company">
      <div className="max-w-3xl space-y-6">
        <h2 className="text-xl font-semibold text-foreground">Управление контентом сайта</h2>

        {/* Section Manager — reorder, toggle, variant select */}
        <AdminSectionManager />

        {/* Separator */}
        <div className="border-t border-border" />

        {/* Content Editor */}
        <div className="admin-card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Type className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Контент секций</h3>
              <p className="text-sm text-muted-foreground">Тексты и содержимое секций главной страницы</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="hero">Hero</TabsTrigger>
              <TabsTrigger value="features">Преимущества</TabsTrigger>
              <TabsTrigger value="stats">Статистика</TabsTrigger>
              <TabsTrigger value="currencies">Валюты</TabsTrigger>
              <TabsTrigger value="cta">CTA</TabsTrigger>
            </TabsList>

            {/* ---- HERO ---- */}
            <TabsContent value="hero" className="space-y-4">
              <div>
                <Label>Бейдж</Label>
                <Input value={hero.badge} onChange={(e) => setHero({ ...hero, badge: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Заголовок (до выделения)</Label>
                <Input value={hero.title} onChange={(e) => setHero({ ...hero, title: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Выделенное слово</Label>
                <Input value={hero.title_highlight} onChange={(e) => setHero({ ...hero, title_highlight: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Подзаголовок (после выделения)</Label>
                <Input value={hero.subtitle} onChange={(e) => setHero({ ...hero, subtitle: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Описание</Label>
                <Textarea value={hero.description} onChange={(e) => setHero({ ...hero, description: e.target.value })} rows={3} className="mt-1" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Преимущества (галочки)</Label>
                  <Button variant="ghost" size="sm" onClick={addTrust}>
                    <Plus className="w-4 h-4 mr-1" /> Добавить
                  </Button>
                </div>
                {hero.trusts.map((t, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <Input value={t} onChange={(e) => updateTrust(i, e.target.value)} />
                    <Button variant="ghost" size="icon" onClick={() => removeTrust(i)}>
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button variant="gradient" className="w-full" disabled={isPending} onClick={handleSaveHero}>
                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Сохранить Hero
              </Button>
            </TabsContent>

            {/* ---- FEATURES ---- */}
            <TabsContent value="features" className="space-y-4">
              <div>
                <Label>Заголовок</Label>
                <Input value={features.title} onChange={(e) => setFeatures({ ...features, title: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Выделенное слово</Label>
                <Input value={features.title_highlight} onChange={(e) => setFeatures({ ...features, title_highlight: e.target.value })} className="mt-1" placeholder="Название компании (пусто = из брендинга)" />
              </div>
              <div>
                <Label>Подзаголовок</Label>
                <Input value={features.subtitle} onChange={(e) => setFeatures({ ...features, subtitle: e.target.value })} className="mt-1" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Карточки</Label>
                  <Button variant="ghost" size="sm" onClick={addFeature}>
                    <Plus className="w-4 h-4 mr-1" /> Добавить
                  </Button>
                </div>
                {features.items.map((item, i) => (
                  <div key={i} className="p-4 rounded-lg bg-muted/30 border border-border/50 mb-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input value={item.title} onChange={(e) => updateFeature(i, "title", e.target.value)} placeholder="Заголовок" className="flex-1" />
                      <Select value={item.icon} onValueChange={(v) => updateFeature(i, "icon", v)}>
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ICON_OPTIONS.map((ic) => (
                            <SelectItem key={ic} value={ic}>{ic}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" onClick={() => removeFeature(i)}>
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                    <Textarea value={item.description} onChange={(e) => updateFeature(i, "description", e.target.value)} placeholder="Описание" rows={2} />
                  </div>
                ))}
              </div>

              <Button variant="gradient" className="w-full" disabled={isPending} onClick={handleSaveFeatures}>
                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Сохранить Преимущества
              </Button>
            </TabsContent>

            {/* ---- STATS ---- */}
            <TabsContent value="stats" className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <Label>Показатели</Label>
                <Button variant="ghost" size="sm" onClick={addStat}>
                  <Plus className="w-4 h-4 mr-1" /> Добавить
                </Button>
              </div>
              {stats.items.map((item, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Input value={item.value} onChange={(e) => updateStat(i, "value", e.target.value)} placeholder="$50M+" className="flex-1" />
                  <Input value={item.label} onChange={(e) => updateStat(i, "label", e.target.value)} placeholder="Объём обмена" className="flex-1" />
                  <Button variant="ghost" size="icon" onClick={() => removeStat(i)}>
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </div>
              ))}

              <Button variant="gradient" className="w-full" disabled={isPending} onClick={handleSaveStats}>
                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Сохранить Статистику
              </Button>
            </TabsContent>

            {/* ---- CURRENCIES ---- */}
            <TabsContent value="currencies" className="space-y-4">
              <div className="p-6 rounded-lg bg-muted/20 border border-border/30 text-center">
                <p className="text-sm text-muted-foreground">
                  Валюты настраиваются в разделе{" "}
                  <span className="text-primary font-medium">Курсы валют</span>.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Секция автоматически отображает активные валюты оператора.
                </p>
              </div>
            </TabsContent>

            {/* ---- CTA ---- */}
            <TabsContent value="cta" className="space-y-4">
              <div>
                <Label>Заголовок</Label>
                <Input
                  value={cta.title}
                  onChange={(e) => setCta({ ...cta, title: e.target.value })}
                  className="mt-1"
                  placeholder="Начните обмен прямо сейчас"
                />
              </div>
              <div>
                <Label>Описание</Label>
                <Textarea
                  value={cta.description}
                  onChange={(e) => setCta({ ...cta, description: e.target.value })}
                  rows={3}
                  className="mt-1"
                  placeholder="Безопасно, быстро и по лучшему курсу..."
                />
              </div>
              <div>
                <Label>Текст кнопки</Label>
                <Input
                  value={cta.button_text}
                  onChange={(e) => setCta({ ...cta, button_text: e.target.value })}
                  className="mt-1"
                  placeholder="Начать обмен"
                />
              </div>
              <div>
                <Label>Ссылка кнопки</Label>
                <Input
                  value={cta.button_link}
                  onChange={(e) => setCta({ ...cta, button_link: e.target.value })}
                  className="mt-1"
                  placeholder="#exchange"
                />
              </div>

              {/* Preview */}
              <div className="mt-4">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Предпросмотр</Label>
                <div className="mt-2 p-6 rounded-xl bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-primary/20 text-center">
                  <h3 className="text-lg font-bold text-foreground mb-2">{cta.title || "Заголовок"}</h3>
                  <p className="text-sm text-foreground mb-4">{cta.description || "Описание"}</p>
                  <span className="inline-block px-4 py-2 rounded-lg bg-primary/30 text-primary text-sm font-medium">
                    {cta.button_text || "Кнопка"}
                  </span>
                </div>
              </div>

              <Button variant="gradient" className="w-full" disabled={isPending} onClick={handleSaveCTA}>
                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Сохранить CTA
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </RequirePermission>
  );
}
