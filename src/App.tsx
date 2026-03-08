import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { SettingsProvider } from "@/hooks/useSettings";
import { ThemeProvider } from "@/hooks/useTheme";
import { LanguageProvider } from "@/hooks/useLanguage";
import { AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import PageTransition from "@/components/PageTransition";
import Index from "./pages/Index";
import Contacts from "./pages/Contacts";
import Helplines from "./pages/Helplines";
import Auth from "./pages/Auth";
import SafeRoutes from "./pages/SafeRoutes";
import SafetyMap from "./pages/SafetyMap";
import ActivityLog from "./pages/ActivityLog";
import SettingsPage from "./pages/Settings";
import Evidence from "./pages/Evidence";
import CommunityFeed from "./pages/CommunityFeed";
import HotspotAnalytics from "./pages/HotspotAnalytics";
import AIChatbot from "./pages/AIChatbot";
import IncidentReport from "./pages/IncidentReport";
import ThreatAssessment from "./pages/ThreatAssessment";
import SelfDefense from "./pages/SelfDefense";
import FloatingSOSWidget from "./components/FloatingSOSWidget";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Index /></PageTransition>} />
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/contacts" element={<PageTransition><ProtectedRoute><Contacts /></ProtectedRoute></PageTransition>} />
        <Route path="/helplines" element={<PageTransition><Helplines /></PageTransition>} />
        <Route path="/safe-routes" element={<PageTransition><ProtectedRoute><SafeRoutes /></ProtectedRoute></PageTransition>} />
        <Route path="/safety-map" element={<PageTransition><ProtectedRoute><SafetyMap /></ProtectedRoute></PageTransition>} />
        <Route path="/activity" element={<PageTransition><ProtectedRoute><ActivityLog /></ProtectedRoute></PageTransition>} />
        <Route path="/settings" element={<PageTransition><ProtectedRoute><SettingsPage /></ProtectedRoute></PageTransition>} />
        <Route path="/evidence" element={<PageTransition><ProtectedRoute><Evidence /></ProtectedRoute></PageTransition>} />
        <Route path="/community" element={<PageTransition><ProtectedRoute><CommunityFeed /></ProtectedRoute></PageTransition>} />
        <Route path="/hotspots" element={<PageTransition><ProtectedRoute><HotspotAnalytics /></ProtectedRoute></PageTransition>} />
        <Route path="/ai-chat" element={<PageTransition><AIChatbot /></PageTransition>} />
        <Route path="/incident-report" element={<PageTransition><IncidentReport /></PageTransition>} />
        <Route path="/threat-assessment" element={<PageTransition><ThreatAssessment /></PageTransition>} />
        <Route path="/self-defense" element={<PageTransition><SelfDefense /></PageTransition>} />
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
      <LanguageProvider>
      <AuthProvider>
        <SettingsProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Navbar />
            <AnimatedRoutes />
          </BrowserRouter>
        </SettingsProvider>
      </AuthProvider>
      </LanguageProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
