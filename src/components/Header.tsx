import { Menu, X, LogOut, User, Shield, FileText, ChevronRight, GraduationCap } from "lucide-react";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useBrandingContext, useThemeLogo } from "@/contexts/BrandingContext";
import { useQuizGate } from "@/hooks/useQuizGate";
import { useQuizModal } from "@/components/QuizContext";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut, loading } = useAuth();
  const { canAccessAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const branding = useBrandingContext();
  const logoUrl = useThemeLogo();
  const { requireQuiz } = useQuizGate();
  const { openQuiz } = useQuizModal();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {requireQuiz && (
        <button
          onClick={openQuiz}
          className="w-full bg-amber-500/15 border-b border-amber-500/30 text-amber-700 dark:text-amber-200 text-sm py-2 px-4 flex items-center justify-center gap-2 hover:bg-amber-500/25 transition-colors"
        >
          <GraduationCap className="w-4 h-4 shrink-0" />
          <span className="truncate">Перед обменом пройдите короткий тест знаний</span>
          <span className="font-semibold underline shrink-0">Пройти →</span>
        </button>
      )}
      <div className="backdrop-blur-xl bg-background/70 dark:bg-background/60 border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-[72px]">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 shrink-0">
              <img src={logoUrl} alt={branding.company_name} className="h-8 sm:h-9 w-auto" />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-0.5 mx-8">
              <a href="/#exchange" className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05] transition-all duration-200">
                Обмен
              </a>
              <a href="/#features" className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05] transition-all duration-200">
                Преимущества
              </a>
              <a href="/#currencies" className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05] transition-all duration-200">
                Валюты
              </a>
              <a href="/#faq" className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05] transition-all duration-200">
                FAQ
              </a>
            </nav>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-2">
              {loading ? (
                <div className="w-20 h-9 bg-secondary/50 rounded-lg animate-pulse" />
              ) : user ? (
                <>
                  {canAccessAdmin && (
                    <Button variant="ghost" size="sm" className="rounded-lg text-muted-foreground hover:text-foreground" onClick={() => navigate('/admin')}>
                      <Shield className="w-4 h-4 mr-1.5" />
                      Админ
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="rounded-lg text-muted-foreground hover:text-foreground" onClick={() => navigate('/orders')}>
                    <FileText className="w-4 h-4 mr-1.5" />
                    Заявки
                  </Button>
                  <div className="w-px h-5 bg-border/60 mx-1" />
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-foreground/[0.04]">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-sm font-medium">{user.email?.split('@')[0]}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-lg h-9 w-9 text-muted-foreground hover:text-foreground" onClick={handleSignOut} title="Выйти">
                    <LogOut className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-lg font-medium"
                    onClick={() => navigate('/auth')}
                  >
                    Войти
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm font-medium"
                    onClick={() => navigate('/auth')}
                  >
                    Начать обмен
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-2">
              <button
                className="p-2 rounded-lg hover:bg-foreground/[0.05] transition-colors"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden backdrop-blur-xl bg-background/95 dark:bg-background/95 border-b border-border/40 animate-fade-in">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <nav className="flex flex-col gap-1">
              <a href="/#exchange" onClick={() => setIsMenuOpen(false)} className="px-4 py-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05] transition-all font-medium">
                Обмен
              </a>
              <a href="/#features" onClick={() => setIsMenuOpen(false)} className="px-4 py-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05] transition-all font-medium">
                Преимущества
              </a>
              <a href="/#currencies" onClick={() => setIsMenuOpen(false)} className="px-4 py-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05] transition-all font-medium">
                Валюты
              </a>
              <a href="/#faq" onClick={() => setIsMenuOpen(false)} className="px-4 py-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05] transition-all font-medium">
                FAQ
              </a>
              <div className="flex flex-col gap-2 pt-3 mt-2 border-t border-border/40">
                {loading ? (
                  <div className="w-full h-10 bg-secondary/50 rounded-xl animate-pulse" />
                ) : user ? (
                  <>
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-foreground/[0.03]">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium">{user.email}</span>
                    </div>
                    <Button variant="ghost" className="justify-start rounded-xl h-11" onClick={() => { navigate('/orders'); setIsMenuOpen(false); }}>
                      <FileText className="w-4 h-4 mr-2" />
                      Мои заявки
                    </Button>
                    {canAccessAdmin && (
                      <Button variant="ghost" className="justify-start rounded-xl h-11" onClick={() => { navigate('/admin'); setIsMenuOpen(false); }}>
                        <Shield className="w-4 h-4 mr-2" />
                        Админ-панель
                      </Button>
                    )}
                    <Button variant="ghost" className="justify-start rounded-xl h-11 text-muted-foreground" onClick={handleSignOut}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Выйти
                    </Button>
                  </>
                ) : (
                  <div className="flex gap-3 pt-1">
                    <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={() => { navigate('/auth'); setIsMenuOpen(false); }}>
                      Войти
                    </Button>
                    <Button
                      className="flex-1 rounded-xl h-11 bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => { navigate('/auth'); setIsMenuOpen(false); }}
                    >
                      Начать обмен
                    </Button>
                  </div>
                )}
              </div>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
