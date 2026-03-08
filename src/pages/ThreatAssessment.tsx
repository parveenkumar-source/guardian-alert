import { useState } from "react";
import { ShieldAlert, Loader2, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
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

const riskColors: Record<string, string> = {
  LOW: "text-green-500 bg-green-500/10 border-green-500/30",
  MODERATE: "text-yellow-500 bg-yellow-500/10 border-yellow-500/30",
  HIGH: "text-orange-500 bg-orange-500/10 border-orange-500/30",
  CRITICAL: "text-red-500 bg-red-500/10 border-red-500/30",
};

const riskIcons: Record<string, typeof CheckCircle> = {
  LOW: CheckCircle,
  MODERATE: AlertTriangle,
  HIGH: AlertTriangle,
  CRITICAL: XCircle,
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

  const RiskIcon = assessment ? (riskIcons[assessment.riskLevel] || AlertTriangle) : AlertTriangle;

  return (
    <div className="min-h-screen pt-14 pb-20 md:pb-0">
      <div className="container mx-auto max-w-2xl px-4 py-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-3">
            <ShieldAlert className="w-3.5 h-3.5" />
            AI
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">{t("threat_title")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("threat_subtitle")}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{t("threat_describe")}</label>
            <textarea
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              placeholder={t("threat_describe_placeholder")}
              rows={4}
              className="w-full glass-card px-4 py-3 text-sm rounded-xl bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t("threat_location")}</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t("threat_location_placeholder")}
                className="w-full glass-card px-4 py-3 text-sm rounded-xl bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t("threat_time")}</label>
              <select
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(e.target.value)}
                className="w-full glass-card px-4 py-3 text-sm rounded-xl bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
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

          <label className="flex items-center gap-3 glass-card px-4 py-3 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={alone}
              onChange={(e) => setAlone(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm text-foreground">{t("threat_alone")}</span>
          </label>

          <button
            onClick={assessThreat}
            disabled={loading || !situation.trim()}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{t("threat_analyzing")}</> : <><ShieldAlert className="w-4 h-4" />{t("threat_assess")}</>}
          </button>

          {/* Assessment Result */}
          {assessment && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* Risk Level Badge */}
              <div className={`flex items-center justify-between p-4 rounded-xl border ${riskColors[assessment.riskLevel] || riskColors.MODERATE}`}>
                <div className="flex items-center gap-3">
                  <RiskIcon className="w-6 h-6" />
                  <div>
                    <p className="font-bold text-lg">{assessment.riskLevel}</p>
                    <p className="text-xs opacity-80">{t("threat_risk_score")}: {assessment.riskScore}/10</p>
                  </div>
                </div>
                <div className="w-14 h-14 rounded-full border-4 border-current flex items-center justify-center">
                  <span className="text-xl font-bold">{assessment.riskScore}</span>
                </div>
              </div>

              {/* Summary */}
              <div className="glass-card p-4 rounded-xl">
                <p className="text-sm text-foreground">{assessment.summary}</p>
              </div>

              {/* Threat Analysis */}
              <div className="glass-card p-4 rounded-xl">
                <h3 className="text-sm font-semibold text-foreground mb-2">{t("threat_analysis")}</h3>
                <p className="text-sm text-muted-foreground">{assessment.threatAnalysis}</p>
              </div>

              {/* Immediate Actions */}
              <div className="glass-card p-4 rounded-xl">
                <h3 className="text-sm font-semibold text-foreground mb-2">🚨 {t("threat_immediate_actions")}</h3>
                <ul className="space-y-2">
                  {assessment.immediateActions?.map((action, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Precautions */}
              <div className="glass-card p-4 rounded-xl">
                <h3 className="text-sm font-semibold text-foreground mb-2">🛡️ {t("threat_precautions")}</h3>
                <ul className="space-y-1.5">
                  {assessment.precautions?.map((p, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary">•</span> {p}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Emergency Protocol */}
              <div className="glass-card p-4 rounded-xl border border-destructive/30 bg-destructive/5">
                <h3 className="text-sm font-semibold text-foreground mb-2">📞 {t("threat_emergency")}</h3>
                <p className="text-sm text-muted-foreground">{assessment.emergencyProtocol}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThreatAssessment;
