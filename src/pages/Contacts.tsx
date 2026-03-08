import { useState, useEffect } from "react";
import { Plus, Trash2, UserPlus, Users, Phone, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

const ContactsPage = () => {
  const { t } = useLanguage();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) fetchContacts();
  }, [user]);

  const fetchContacts = async () => {
    const { data, error } = await supabase
      .from("emergency_contacts")
      .select("id, name, phone, relationship")
      .order("created_at", { ascending: true });
    if (error) {
      toast({ title: t("contacts_failed_load"), variant: "destructive" });
    } else {
      setContacts(data || []);
    }
    setLoading(false);
  };

  const isValidE164 = (num: string) => /^\+[1-9]\d{6,14}$/.test(num);

  const handleAdd = async () => {
    if (!name.trim() || !phone.trim()) {
      toast({ title: t("contacts_fill_required"), variant: "destructive" });
      return;
    }
    if (!isValidE164(phone.trim())) {
      toast({ title: t("contacts_phone_format"), variant: "destructive" });
      return;
    }
    const { data, error } = await supabase
      .from("emergency_contacts")
      .insert({ user_id: user!.id, name: name.trim(), phone: phone.trim(), relationship: relationship.trim() || "Other" })
      .select("id, name, phone, relationship")
      .single();
    if (error) {
      toast({ title: t("contacts_failed_add"), variant: "destructive" });
    } else {
      setContacts([...contacts, data]);
      setName(""); setPhone(""); setRelationship("");
      setShowForm(false);
      toast({ title: t("contacts_added") });
    }
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from("emergency_contacts").delete().eq("id", id);
    if (error) {
      toast({ title: t("contacts_failed_remove"), variant: "destructive" });
    } else {
      setContacts(contacts.filter((c) => c.id !== id));
      toast({ title: t("contacts_removed") });
    }
  };

  const avatarColors = [
    "from-primary/80 to-primary/40",
    "from-safe/80 to-safe/40",
    "from-warning/80 to-warning/40",
    "from-violet-500/80 to-violet-500/40",
    "from-blue-500/80 to-blue-500/40",
  ];

  if (loading) {
    return (
      <div className="min-h-screen pt-16 pb-24 md:pb-12 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">{t("contacts_loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 pb-24 md:pb-12 px-4 page-transition">
      <div className="container mx-auto max-w-lg lg:max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">{t("contacts_title")}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{t("contacts_subtitle")}</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all shadow-lg shadow-primary/20"
          >
            <Plus className={`w-5 h-5 transition-transform duration-200 ${showForm ? "rotate-45" : ""}`} />
          </button>
        </div>

        {/* Add Form */}
        {showForm && (
          <div className="glass-card p-4 sm:p-5 mb-5 space-y-3 animate-fade-in-up" style={{ animationFillMode: "forwards" }}>
            <div className="flex items-center gap-2 mb-1">
              <UserPlus className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">{t("contacts_new")}</span>
            </div>
            <input
              type="text" placeholder={t("contacts_full_name")} value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
            <input
              type="tel" placeholder={t("contacts_phone")} value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
            <input
              type="text" placeholder={t("contacts_relationship")} value={relationship} onChange={(e) => setRelationship(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
            <div className="flex gap-2 pt-1">
              <button onClick={handleAdd}
                className="flex-1 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 active:scale-[0.98] transition-all shadow-md shadow-primary/20">
                {t("contacts_add")}
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-4 py-3 rounded-xl bg-secondary text-secondary-foreground text-sm hover:bg-secondary/80 active:scale-[0.98] transition-all">
                {t("cancel")}
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {contacts.length === 0 ? (
          <div className="glass-card p-10 sm:p-14 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-5">
              <Users className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-2">{t("contacts_none_title")}</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">{t("contacts_none_desc")}</p>
            <button onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4" />
              {t("contacts_add_first")}
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {contacts.map((contact, i) => (
              <div key={contact.id}
                className="glass-card-hover p-4 flex items-center justify-between opacity-0 animate-fade-in-up group"
                style={{ animationDelay: `${i * 0.05}s`, animationFillMode: "forwards" }}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${avatarColors[i % avatarColors.length]} flex items-center justify-center shrink-0`}>
                    <span className="text-sm font-bold text-white">{contact.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{contact.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                      <p className="text-xs text-muted-foreground truncate">{contact.phone}</p>
                      <span className="text-muted-foreground/30">·</span>
                      <span className="text-xs text-primary/70 font-medium truncate">{contact.relationship}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => handleRemove(contact.id)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-90 transition-all shrink-0 ml-2 opacity-60 group-hover:opacity-100">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Contact count */}
        {contacts.length > 0 && (
          <p className="text-center text-xs text-muted-foreground mt-5">
            {contacts.length} {contacts.length === 1 ? t("sos_contact") : t("sos_contacts")}
          </p>
        )}
      </div>
    </div>
  );
};

export default ContactsPage;
