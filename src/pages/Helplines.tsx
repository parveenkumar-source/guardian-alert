import { Phone, ExternalLink, Shield } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

const helplines = [
  { nameKey: "helpline_women", number: "181", descKey: "helpline_women_desc" },
  { nameKey: "helpline_police", number: "112", descKey: "helpline_police_desc" },
  { nameKey: "helpline_ncw", number: "7827-170-170", descKey: "helpline_ncw_desc" },
  { nameKey: "helpline_domestic", number: "181", descKey: "helpline_domestic_desc" },
  { nameKey: "helpline_child", number: "1098", descKey: "helpline_child_desc" },
  { nameKey: "helpline_cyber", number: "1930", descKey: "helpline_cyber_desc" },
];

const HelplinesPage = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen pt-16 pb-24 md:pb-12 px-4 page-transition">
      <div className="container mx-auto max-w-lg lg:max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-safe/20 to-safe/5 flex items-center justify-center">
            <Phone className="w-5 h-5 text-safe" />
          </div>
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">{t("helplines_title")}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{t("helplines_subtitle")}</p>
          </div>
        </div>

        {/* Emergency banner */}
        <div className="glass-card p-4 mb-5 flex items-center gap-3 border-primary/20 bg-primary/5">
          <Shield className="w-5 h-5 text-primary shrink-0" />
          <p className="text-sm text-foreground">
            {t("helplines_danger_msg")} <span className="text-primary font-semibold">{t("helplines_immediate_danger")}</span> {t("helplines_call")}{" "}
            <a href="tel:112" className="text-primary font-bold hover:underline">112</a> {t("helplines_right_away")}
          </p>
        </div>

        <div className="space-y-2.5">
          {helplines.map((line, i) => (
            <a
              key={line.number + line.nameKey}
              href={`tel:${line.number.replace(/-/g, "")}`}
              className="glass-card-hover p-4 flex items-center justify-between opacity-0 animate-fade-in-up block"
              style={{ animationDelay: `${i * 0.05}s`, animationFillMode: "forwards" }}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-11 h-11 rounded-xl bg-safe/10 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-safe" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{t(line.nameKey as any)}</p>
                  <p className="text-xs text-muted-foreground truncate">{t(line.descKey as any)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className="text-sm font-display font-bold text-primary whitespace-nowrap">{line.number}</span>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HelplinesPage;
