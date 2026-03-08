import { useState } from "react";
import { ShieldAlert, Loader2, AlertTriangle, CheckCircle, XCircle, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";

interface Assessment {
  riskLevel: string;
  riskScore: number;
  threatAnalysis: string;
  immediateActions: string[];
  precautions: string[];
  emergencyProtocol: string;
  summary: string;
}

const riskConfig: Record<string, { color: string; bg: string; icon: typeof CheckCircle }> = {
  LOW: { color: "text-green-500", bg: "bg-green-500/10 border-green-500/30", icon: CheckCircle },
  MODERATE: { color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/30", icon: AlertTriangle },
  HIGH: { color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/30", icon: AlertTriangle },
  CRITICAL: { color: "text-red-500", bg: "bg-red-500/10 border-red-500/30", icon: XCircle },
};

const ThreatAssessment = () => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [situation, setSituation] = useState("");
  const [location, setLocation] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("");
  const [alone, setAlone] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(false);

  const assessThreat = async () => {
    if (!situation.trim()) {
      toast({ title: t("threat_situation_required"), variant: "destructive" });
      return;
    }
    setLoading(true);
    setAssessment(null);
    try {
      const { data, error } = await supabase.functions.invoke("threat-assessment", {
        body: { situation, location, timeOfDay, alone, language },
      });
      if (error) throw error;
      setAssessment(data.assessment);
    } catch (e: any) {
      toast({ title: t("threat_failed"), description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const config = assessment ? (riskConfig[assessment.riskLevel] || riskConfig.MODERATE) : riskConfig.MODERATE;
  const RiskIcon = config.icon;

  return (
    <div className="min-h-screen pt-14 pb-20 md:pb-0">
      <div className="container mx-auto max-w-2xl px-3 sm:px-4 py-5 sm:py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-warning/20 to-warning/5 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">{t("threat_title")}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{t("threat_subtitle")}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs sm:text-sm font-medium text-foreground mb-1.5 block">{t("threat_describe")}</label>
            <textarea
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              placeholder={t("threat_describe_placeholder")}
              rows={4}
              className="w-full glass-card px-3.5 sm:px-4 py-3 text-sm rounded-xl bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs sm:text-sm font-medium text-foreground mb-1.5 block">{t("threat_location")}</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t("threat_location_placeholder")}
                className="w-full glass-card px-3.5 sm:px-4 py-3 text-sm rounded-xl bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium text-foreground mb-1.5 block">{t("threat_time")}</label>
              <select
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(e.target.value)}
                className="w-full glass-card px-3.5 sm:px-4 py-3 text-sm rounded-xl bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">{t("threat_select_time")}</option>
                <option value="morning">{t("threat_morning")}</option>
                <option value="afternoon">{t("threat_afternoon")}</option>
                <option value="evening">{t("threat_evening")}</option>
                <option value="night">{t("threat_night")}</option>
                <option value="late night">{t("threat_late_night")}</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-3 glass-card px-3.5 sm:px-4 py-3.5 rounded-xl cursor-pointer active:scale-[0.99] transition-transform">
            <input
              type="checkbox"
              checked={alone}
              onChange={(e) => setAlone(e.target.checked)}
              className="w-4.5 h-4.5 rounded border-border text-primary focus:ring-primary accent-primary"
            />
            <span className="text-sm text-foreground">{t("threat_alone")}</span>
          </label>

          <button
            onClick={assessThreat}
            disabled={loading || !situation.trim()}
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{t("threat_analyzing")}</> : <><ShieldAlert className="w-4 h-4" />{t("threat_assess")}</>}
          </button>

          {/* Assessment Result */}
          {assessment && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* Risk Level Badge */}
              <div className={`flex items-center justify-between p-4 rounded-xl border ${config.bg}`}>
                <div className="flex items-center gap-3">
                  <RiskIcon className={`w-6 h-6 sm:w-7 sm:h-7 ${config.color}`} />
                  <div>
                    <p className={`font-bold text-base sm:text-lg ${config.color}`}>{assessment.riskLevel}</p>
                    <p className="text-xs opacity-80 text-muted-foreground">{t("threat_risk_score")}: {assessment.riskScore}/10</p>
                  </div>
                </div>
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border-[3px] ${config.color} border-current flex items-center justify-center`}>
                  <span className={`text-lg sm:text-xl font-bold ${config.color}`}>{assessment.riskScore}</span>
                </div>
              </div>

              {/* Summary */}
              <div className="glass-card p-3.5 sm:p-4 rounded-xl">
                <p className="text-sm text-foreground leading-relaxed">{assessment.summary}</p>
              </div>

              {/* Threat Analysis */}
              <div className="glass-card p-3.5 sm:p-4 rounded-xl">
                <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-2">{t("threat_analysis")}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{assessment.threatAnalysis}</p>
              </div>

              {/* Immediate Actions */}
              <div className="glass-card p-3.5 sm:p-4 rounded-xl">
                <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-2.5">🚨 {t("threat_immediate_actions")}</h3>
                <ul className="space-y-2">
                  {assessment.immediateActions?.map((action, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-muted-foreground">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                      <span className="leading-relaxed">{action}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Precautions */}
              <div className="glass-card p-3.5 sm:p-4 rounded-xl">
                <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-2">🛡️ {t("threat_precautions")}</h3>
                <ul className="space-y-1.5">
                  {assessment.precautions?.map((p, i) => (
                    <li key={i} className="text-xs sm:text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span className="leading-relaxed">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Emergency Protocol */}
              <div className="glass-card p-3.5 sm:p-4 rounded-xl border border-destructive/20 bg-destructive/5">
                <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-2">📞 {t("threat_emergency")}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{assessment.emergencyProtocol}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThreatAssessment;
