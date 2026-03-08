import { useLanguage } from "@/hooks/useLanguage";
import { Languages } from "lucide-react";

const LanguageToggle = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <button
      onClick={() => setLanguage(language === "en" ? "hi" : "en")}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all"
      title={language === "en" ? "हिंदी में बदलें" : "Switch to English"}
    >
      <Languages className="w-3.5 h-3.5" />
      {language === "en" ? "हिं" : "EN"}
    </button>
  );
};

export default LanguageToggle;
