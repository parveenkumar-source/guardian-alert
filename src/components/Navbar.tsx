import { Link, useLocation, useNavigate } from "react-router-dom";
import { Shield, Users, Home, Phone, LogIn, LogOut, Navigation, FileText, Settings, MapPin, Camera, MessageSquare, Menu, X, AlertTriangle, Bot, ShieldAlert, FileCheck, Swords, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import LanguageToggle from "@/components/LanguageToggle";
import { useState } from "react";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mainLinks = [
    { to: "/", label: t("nav_home"), icon: Home },
    { to: "/safe-routes", label: t("nav_routes"), icon: Navigation },
    { to: "/safety-map", label: t("nav_map"), icon: MapPin },
    { to: "/community", label: t("nav_feed"), icon: MessageSquare },
    { to: "/contacts", label: t("nav_contacts"), icon: Users },
  ];

  const drawerSections = [
    {
      title: "Safety Tools",
      links: [
        { to: "/safe-routes", label: t("nav_routes"), icon: Navigation },
        { to: "/safety-map", label: t("nav_map"), icon: MapPin },
        { to: "/ai-chat", label: t("nav_chatbot"), icon: Bot },
        { to: "/threat-assessment", label: t("nav_threat"), icon: ShieldAlert },
        { to: "/self-defense", label: "Self-Defense", icon: Swords },
      ],
    },
    {
      title: "Report & Evidence",
      links: [
        { to: "/incident-report", label: t("nav_incident"), icon: FileCheck },
        { to: "/evidence", label: t("nav_evidence"), icon: Camera },
        { to: "/hotspots", label: t("nav_hotspots"), icon: AlertTriangle },
        { to: "/activity", label: t("nav_log"), icon: FileText },
      ],
    },
    {
      title: "Connect & Help",
      links: [
        { to: "/community", label: t("nav_feed"), icon: MessageSquare },
        { to: "/contacts", label: t("nav_contacts"), icon: Users },
        { to: "/helplines", label: t("nav_helplines"), icon: Phone },
        { to: "/settings", label: t("nav_settings"), icon: Settings },
      ],
    },
  ];

  const desktopLinks = [
    { to: "/safe-routes", label: t("nav_routes"), icon: Navigation },
    { to: "/safety-map", label: t("nav_map"), icon: MapPin },
    { to: "/community", label: t("nav_feed"), icon: MessageSquare },
    { to: "/contacts", label: t("nav_contacts"), icon: Users },
    { to: "/ai-chat", label: t("nav_chatbot"), icon: Bot },
    { to: "/incident-report", label: t("nav_incident"), icon: FileCheck },
    { to: "/threat-assessment", label: t("nav_threat"), icon: ShieldAlert },
    { to: "/helplines", label: t("nav_helplines"), icon: Phone },
    { to: "/hotspots", label: t("nav_hotspots"), icon: AlertTriangle },
    { to: "/activity", label: t("nav_log"), icon: FileText },
    { to: "/evidence", label: t("nav_evidence"), icon: Camera },
    { to: "/self-defense", label: "Self-Defense", icon: Swords },
    { to: "/settings", label: t("nav_settings"), icon: Settings },
  ];

  const bottomNavLinks = [
    { to: "/", label: t("nav_home"), icon: Home },
    { to: "/safety-map", label: t("nav_map"), icon: MapPin },
    { to: "/ai-chat", label: "AI", icon: Bot },
    { to: "/contacts", label: t("nav_contacts"), icon: Users },
    { to: "/settings", label: t("nav_more"), icon: Menu, isMore: true },
  ];

  const handleSignOut = async () => {
    await signOut();
    setMobileMenuOpen(false);
    navigate("/");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Desktop top navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md shadow-primary/20 group-hover:shadow-lg group-hover:shadow-primary/30 transition-shadow">
              <Shield className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg text-foreground tracking-tight">Raksha</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-0.5">
            {desktopLinks.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  isActive(to)
                    ? "bg-primary/15 text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                }`}>
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            ))}

            <div className="w-px h-6 bg-border mx-1" />
            <LanguageToggle />

            {user ? (
              <button onClick={handleSignOut}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all">
                <LogOut className="w-3.5 h-3.5" />
                {t("sign_out")}
              </button>
            ) : (
              <Link to="/auth"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive("/auth")
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                }`}>
                <LogIn className="w-3.5 h-3.5" />
                {t("sign_in")}
              </Link>
            )}
          </div>

          {/* Mobile: lang toggle + auth button */}
          <div className="flex md:hidden items-center gap-1">
            <LanguageToggle />
            {user ? (
              <button onClick={handleSignOut}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <Link to="/auth"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-all">
                <LogIn className="w-3.5 h-3.5" />
                {t("sign_in")}
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="bg-card/95 backdrop-blur-2xl border-t border-border/50 px-2 pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-around h-[4.25rem]">
            {bottomNavLinks.map((item) => {
              if (item.isMore) {
                return (
                  <button
                    key="more"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className={`flex flex-col items-center justify-center gap-0.5 min-w-[3.5rem] py-2 rounded-2xl transition-all duration-200 ${
                      mobileMenuOpen ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                      mobileMenuOpen ? "bg-primary/15 scale-95" : "active:scale-90"
                    }`}>
                      {mobileMenuOpen ? <X className="w-5 h-5" /> : <item.icon className="w-5 h-5" />}
                    </div>
                    <span className="text-[9px] font-semibold tracking-wide">{mobileMenuOpen ? t("close") : item.label}</span>
                  </button>
                );
              }
              return (
                <Link key={item.to} to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`relative flex flex-col items-center justify-center gap-0.5 min-w-[3.5rem] py-2 rounded-2xl transition-all duration-200 ${
                    isActive(item.to)
                      ? "text-primary"
                      : "text-muted-foreground active:text-foreground"
                  }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                    isActive(item.to) ? "bg-primary/15" : "active:scale-90"
                  }`}>
                    <item.icon className={`w-5 h-5 ${isActive(item.to) ? "drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]" : ""}`} />
                  </div>
                  <span className="text-[9px] font-semibold tracking-wide">{item.label}</span>
                  {isActive(item.to) && (
                    <div className="absolute -top-0.5 w-5 h-0.5 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile "More" drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />
          <div
            className="absolute bottom-[5rem] left-2 right-2 max-h-[72vh] overflow-y-auto rounded-2xl border border-border/60 bg-card/95 backdrop-blur-2xl shadow-2xl shadow-black/20 animate-in slide-in-from-bottom-6 fade-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {drawerSections.map((section, sectionIdx) => (
              <div key={section.title}>
                <div className="px-4 pt-3 pb-1">
                  <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.15em]">{section.title}</p>
                </div>
                <div className="px-2 pb-1">
                  {section.links.map(({ to, label, icon: Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 group ${
                        isActive(to)
                          ? "bg-primary/12 text-primary"
                          : "text-foreground/80 active:bg-secondary/80"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isActive(to) ? "bg-primary/20" : "bg-secondary/60 group-active:bg-secondary"
                      }`}>
                        <Icon className={`w-[18px] h-[18px] ${isActive(to) ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <span className="flex-1">{label}</span>
                      <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground/40 transition-transform group-active:translate-x-0.5 ${isActive(to) ? "text-primary/40" : ""}`} />
                    </Link>
                  ))}
                </div>
                {sectionIdx < drawerSections.length - 1 && (
                  <div className="mx-4 border-t border-border/40" />
                )}
              </div>
            ))}

            {/* Auth row in drawer */}
            <div className="px-2 pb-3 pt-1">
              <div className="mx-2 border-t border-border/40 mb-2" />
              <div className="flex items-center gap-2 px-3">
                <LanguageToggle />
                {user ? (
                  <button onClick={handleSignOut}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-medium text-muted-foreground active:bg-secondary/80 transition-all">
                    <LogOut className="w-4 h-4" />
                    {t("sign_out")}
                  </button>
                ) : (
                  <Link to="/auth" onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium bg-primary/10 text-primary active:bg-primary/20 transition-all">
                    <LogIn className="w-4 h-4" />
                    {t("sign_in")}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
