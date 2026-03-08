import { useState, useEffect } from "react";
import { Plus, Trash2, UserPlus, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

const ContactsPage = () => {
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
      toast({ title: "Failed to load contacts", variant: "destructive" });
    } else {
      setContacts(data || []);
    }
    setLoading(false);
  };

  const isValidE164 = (num: string) => /^\+[1-9]\d{6,14}$/.test(num);

  const handleAdd = async () => {
    if (!name.trim() || !phone.trim()) {
      toast({ title: "Please fill in name and phone number", variant: "destructive" });
      return;
    }
    if (!isValidE164(phone.trim())) {
      toast({ title: "Phone must be in E.164 format (e.g. +919876119169)", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase
      .from("emergency_contacts")
      .insert({ user_id: user!.id, name: name.trim(), phone: phone.trim(), relationship: relationship.trim() || "Other" })
      .select("id, name, phone, relationship")
      .single();

    if (error) {
      toast({ title: "Failed to add contact", variant: "destructive" });
    } else {
      setContacts([...contacts, data]);
      setName("");
      setPhone("");
      setRelationship("");
      setShowForm(false);
      toast({ title: "Contact added successfully" });
    }
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from("emergency_contacts").delete().eq("id", id);
    if (error) {
      toast({ title: "Failed to remove contact", variant: "destructive" });
    } else {
      setContacts(contacts.filter((c) => c.id !== id));
      toast({ title: "Contact removed" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-16 pb-24 md:pb-12 flex items-center justify-center">
        <p className="text-muted-foreground">Loading contacts...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-lg">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Emergency Contacts</h1>
            <p className="text-sm text-muted-foreground mt-1">People who will be alerted during SOS</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center hover:bg-primary/25 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {showForm && (
          <div className="glass-card p-5 mb-6 space-y-4 animate-fade-in-up" style={{ animationFillMode: "forwards" }}>
            <div className="flex items-center gap-2 mb-2">
              <UserPlus className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">New Contact</span>
            </div>
            <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <input type="tel" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <input type="text" placeholder="Relationship (e.g., Parent, Friend)" value={relationship} onChange={(e) => setRelationship(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <div className="flex gap-3">
              <button onClick={handleAdd}
                className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors">
                Add Contact
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-lg bg-secondary text-secondary-foreground text-sm hover:bg-secondary/80 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {contacts.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-display text-lg font-semibold text-foreground mb-2">No contacts yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Add trusted people who should be alerted in an emergency.</p>
            <button onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" />
              Add First Contact
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact, i) => (
              <div key={contact.id}
                className="glass-card-hover p-4 flex items-center justify-between opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${i * 0.05}s`, animationFillMode: "forwards" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">{contact.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{contact.name}</p>
                    <p className="text-xs text-muted-foreground">{contact.phone} · {contact.relationship}</p>
                  </div>
                </div>
                <button onClick={() => handleRemove(contact.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactsPage;
