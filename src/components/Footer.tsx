import * as React from "react";
import { Link } from "react-router-dom";
import { Mail, MessageCircle, Twitter, Instagram } from "lucide-react";
import { useBrandingContext, useThemeLogo } from "@/contexts/BrandingContext";

const Footer = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => {
  const branding = useBrandingContext();
  const logoUrl = useThemeLogo();

  const socialLinks = [
    { url: branding.social_twitter, icon: Twitter },
    { url: branding.social_telegram, icon: MessageCircle },
    { url: branding.social_instagram, icon: Instagram },
  ].filter((s) => s.url);

  return (
    <footer ref={ref} className={`border-t border-border/30 ${className || ""}`} {...props}>
      <div className="container mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-8">
          <div className="max-w-xs">
            <Link to="/" className="flex items-center gap-2 mb-3">
              <img src={logoUrl} alt={branding.company_name} className="h-8 w-auto" />
            </Link>
            {branding.tagline && (
              <p className="text-sm text-muted-foreground">{branding.tagline}</p>
            )}
            {socialLinks.length > 0 && (
              <div className="flex gap-3 mt-4">
                {socialLinks.map(({ url, icon: Icon }) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                    <Icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-12 text-sm">
            <div>
              <h4 className="font-medium mb-3">Документы</h4>
              <ul className="space-y-2">
                <li><Link to="/legal/offer" className="text-muted-foreground hover:text-foreground transition-colors">Оферта</Link></li>
                <li><Link to="/legal/terms" className="text-muted-foreground hover:text-foreground transition-colors">Условия использования</Link></li>
                <li><Link to="/legal/privacy" className="text-muted-foreground hover:text-foreground transition-colors">Конфиденциальность</Link></li>
                <li><Link to="/legal/aml" className="text-muted-foreground hover:text-foreground transition-colors">AML политика</Link></li>
              </ul>
            </div>

            {branding.email && (
              <div>
                <h4 className="font-medium mb-3">Контакты</h4>
                <ul className="space-y-2">
                  <li>
                    <a href={`mailto:${branding.email}`} className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      {branding.email}
                    </a>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="pt-6 border-t border-border/20 text-center">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} {branding.company_name}. Все права защищены.
          </p>
        </div>
      </div>
    </footer>
  );
});
Footer.displayName = "Footer";

export default Footer;
