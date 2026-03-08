import { useState } from "react";
import { FileText, Copy, Download, Loader2, FileCheck } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";

const IncidentReport = () => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [description, setDescription] = useState("");
  const [incidentType, setIncidentType] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);

  const incidentTypes = [
    t("incident_type_harassment"),
    t("incident_type_stalking"),
    t("incident_type_assault"),
    t("incident_type_eve_teasing"),
    t("incident_type_domestic"),
    t("incident_type_cyber"),
    t("incident_type_theft"),
    t("incident_type_other"),
  ];

  const generateReport = async () => {
    if (!description.trim()) {
      toast({ title: t("incident_desc_required"), variant: "destructive" });
      return;
    }
    setLoading(true);
    setReport("");
    try {
      const { data, error } = await supabase.functions.invoke("incident-report", {
        body: { description, incidentType, location, date, language },
      });
      if (error) throw error;
      setReport(data.report || "");
    } catch (e: any) {
      toast({ title: t("incident_failed"), description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyReport = () => {
    navigator.clipboard.writeText(report);
    toast({ title: t("incident_copied") });
  };

  const downloadReport = () => {
    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `incident-report-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen pt-14 pb-20 md:pb-0">
      <div className="container mx-auto max-w-2xl px-3 sm:px-4 py-5 sm:py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <FileCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">{t("incident_title")}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{t("incident_subtitle")}</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Incident Type */}
          <div>
            <label className="text-xs sm:text-sm font-medium text-foreground mb-1.5 block">{t("incident_type")}</label>
            <select
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
              className="w-full glass-card px-3.5 sm:px-4 py-3 text-sm rounded-xl bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">{t("incident_select_type")}</option>
              {incidentTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Date & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs sm:text-sm font-medium text-foreground mb-1.5 block">{t("incident_date")}</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full glass-card px-3.5 sm:px-4 py-3 text-sm rounded-xl bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium text-foreground mb-1.5 block">{t("incident_location")}</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t("incident_location_placeholder")}
                className="w-full glass-card px-3.5 sm:px-4 py-3 text-sm rounded-xl bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs sm:text-sm font-medium text-foreground mb-1.5 block">{t("incident_describe")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("incident_describe_placeholder")}
              rows={5}
              className="w-full glass-card px-3.5 sm:px-4 py-3 text-sm rounded-xl bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          <button
            onClick={generateReport}
            disabled={loading || !description.trim()}
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{t("incident_generating")}</> : <><FileText className="w-4 h-4" />{t("incident_generate")}</>}
          </button>

          {/* Generated Report */}
          {report && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">{t("incident_generated_report")}</h2>
                <div className="flex gap-1.5">
                  <button onClick={copyReport} className="p-2.5 rounded-xl hover:bg-secondary active:scale-90 transition-all text-muted-foreground hover:text-foreground">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button onClick={downloadReport} className="p-2.5 rounded-xl hover:bg-secondary active:scale-90 transition-all text-muted-foreground hover:text-foreground">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="glass-card p-4 sm:p-5 rounded-xl prose prose-sm dark:prose-invert max-w-none [&_h1]:text-base [&_h2]:text-sm">
                <ReactMarkdown>{report}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IncidentReport;
