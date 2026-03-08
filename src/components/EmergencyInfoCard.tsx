import { useState, useEffect } from "react";
import { Heart, Save, Check, User, Droplets, AlertTriangle, Pill, FileText, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const EmergencyInfoCard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    blood_type: "",
    allergies: "",
    medical_conditions: "",
    medications: "",
    emergency_notes: "",
    date_of_birth: "",
  });

  const { data: info } = useQuery({
    queryKey: ["emergency-info", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("emergency_info")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data ?? null;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (info) {
      setForm({
        full_name: info.full_name || "",
        blood_type: info.blood_type || "",
        allergies: info.allergies || "",
        medical_conditions: info.medical_conditions || "",
        medications: info.medications || "",
        emergency_notes: info.emergency_notes || "",
        date_of_birth: info.date_of_birth || "",
      });
    }
  }, [info]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const payload = {
      full_name: form.full_name || null,
      blood_type: form.blood_type || null,
      allergies: form.allergies || null,
      medical_conditions: form.medical_conditions || null,
      medications: form.medications || null,
      emergency_notes: form.emergency_notes || null,
      date_of_birth: form.date_of_birth || null,
      user_id: user.id,
    };
    let error;

    if (info) {
      // Update existing record
      const result = await supabase
        .from("emergency_info")
        .update(payload)
        .eq("user_id", user.id);
      error = result.error;
    } else {
      // Insert new record
      const result = await supabase
        .from("emergency_info")
        .insert(payload);
      error = result.error;
    }

    if (error) {
      console.error("Emergency info save error:", error);
      toast({ title: "Failed to save", variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["emergency-info"] });
      toast({ title: "Emergency info saved ✅" });
      setEditing(false);
    }
    setSaving(false);
  };

  if (!user) return null;

  // View mode - compact card
  if (!editing) {
    const hasInfo = info && (info.blood_type || info.allergies || info.medical_conditions);

    return (
      <button
        onClick={() => setEditing(true)}
        className="glass-card-hover p-3 w-full flex items-center gap-3 text-left"
      >
        <div className="w-9 h-9 rounded-full bg-rose-500/10 flex items-center justify-center">
          <Heart className="w-4.5 h-4.5 text-rose-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Emergency Info Card</p>
          <p className="text-xs text-muted-foreground truncate">
            {hasInfo
              ? `${info.blood_type || "No blood type"} · ${info.allergies ? "Has allergies" : "No allergies"}`
              : "Tap to add medical info for emergencies"}
          </p>
        </div>
        {hasInfo && (
          <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 text-[10px] font-medium">
            Set
          </span>
        )}
      </button>
    );
  }

  // Edit mode
  return (
    <div className="glass-card p-4 w-full space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-rose-500" />
          <p className="text-sm font-semibold text-foreground">Emergency Info</p>
        </div>
        <button
          onClick={() => setEditing(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>

      <div className="space-y-2.5">
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Full Name"
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={form.blood_type}
              onChange={(e) => setForm((f) => ({ ...f, blood_type: e.target.value }))}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none"
            >
              <option value="">Blood Type</option>
              {BLOOD_TYPES.map((bt) => (
                <option key={bt} value={bt}>{bt}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="date"
              value={form.date_of_birth}
              onChange={(e) => setForm((f) => ({ ...f, date_of_birth: e.target.value }))}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="relative">
          <AlertTriangle className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
          <textarea
            placeholder="Allergies (comma separated)"
            value={form.allergies}
            onChange={(e) => setForm((f) => ({ ...f, allergies: e.target.value }))}
            rows={2}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>

        <div className="relative">
          <FileText className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
          <textarea
            placeholder="Medical conditions"
            value={form.medical_conditions}
            onChange={(e) => setForm((f) => ({ ...f, medical_conditions: e.target.value }))}
            rows={2}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>

        <div className="relative">
          <Pill className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
          <textarea
            placeholder="Current medications"
            value={form.medications}
            onChange={(e) => setForm((f) => ({ ...f, medications: e.target.value }))}
            rows={2}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>

        <textarea
          placeholder="Additional emergency notes"
          value={form.emergency_notes}
          onChange={(e) => setForm((f) => ({ ...f, emergency_notes: e.target.value }))}
          rows={2}
          className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-rose-500 text-white text-sm font-medium hover:bg-rose-500/90 transition-colors disabled:opacity-50"
      >
        {saving ? (
          <Save className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Check className="w-4 h-4" />
            Save Emergency Info
          </>
        )}
      </button>

      <p className="text-[10px] text-muted-foreground text-center">
        This info will be shared with emergency responders and your contacts during SOS alerts.
      </p>
    </div>
  );
};

export default EmergencyInfoCard;
