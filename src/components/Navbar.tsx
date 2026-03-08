import { Link, useLocation, useNavigate } from "react-router-dom";
import { Shield, Users, Home, Phone, LogIn, LogOut, Navigation, FileText, Settings, MapPin, Camera, MessageSquare, Menu, X, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mainLinks = [
    { to: "/", label: "Home", icon: Home },
    { to: "/safe-routes", label: "Routes", icon: Navigation },
    { to: "/safety-map", label: "Map", icon: MapPin },
    { to: "/community", label: "Feed", icon: MessageSquare },
    { to: "/contacts", label: "Contacts", icon: Users },
  ];

  const secondaryLinks = [
    { to: "/helplines", label: "Helplines", icon: Phone },
    { to: "/activity", label: "Log", icon: FileText },
    { to: "/evidence", label: "Evidence", icon: Camera },
    { to: "/settings", label: "Settings", icon: Settings },
  ];

  // Bottom nav shows the 5 most important links on mobile
  const bottomNavLinks = [
    { to: "/", label: "Home", icon: Home },
    { to: "/safety-map", label: "Map", icon: MapPin },
    { to: "/community", label: "Feed", icon: MessageSquare },
    { to: "/contacts", label: "Contacts", icon: Users },
    { to: "/settings", label: "More", icon: Menu },
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
            {[...mainLinks.slice(1), ...secondaryLinks].map(({ to, label, icon: Icon }) => (
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

            {user ? (
              <button onClick={handleSignOut}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all">
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            ) : (
              <Link to="/auth"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive("/auth")
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                }`}>
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile: auth button + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            {user ? (
              <button onClick={handleSignOut}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <Link to="/auth"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-all">
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="glass-card border-t border-border/50 rounded-none px-2 pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-around h-14">
            {bottomNavLinks.map(({ to, label, icon: Icon }) => {
              if (label === "More") {
                return (
                  <button
                    key="more"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg transition-all ${
                      mobileMenuOpen ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {mobileMenuOpen ? <X className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    <span className="text-[10px] font-medium">{mobileMenuOpen ? "Close" : label}</span>
                  </button>
                );
              }
              return (
                <Link key={to} to={to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg transition-all ${
                    isActive(to)
                      ? "text-primary"
                      : "text-muted-foreground active:text-foreground"
                  }`}>
                  <Icon className={`w-5 h-5 ${isActive(to) ? "drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]" : ""}`} />
                  <span className="text-[10px] font-medium">{label}</span>
                  {isActive(to) && <div className="absolute -bottom-0.5 w-5 h-0.5 rounded-full bg-primary" />}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile "More" drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
          <div
            className="absolute bottom-16 left-3 right-3 glass-card p-3 space-y-1 animate-in slide-in-from-bottom-4 fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {[...mainLinks.slice(1), ...secondaryLinks].map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive(to)
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
