import { Phone, ExternalLink } from "lucide-react";

const helplines = [
  { name: "Women Helpline (All India)", number: "181", description: "24/7 women in distress helpline" },
  { name: "Police Emergency", number: "112", description: "National emergency number" },
  { name: "Women Commission", number: "7827-170-170", description: "NCW WhatsApp helpline" },
  { name: "Domestic Violence", number: "181", description: "Support for domestic abuse victims" },
  { name: "Child Helpline", number: "1098", description: "For children in need of care" },
  { name: "Cyber Crime", number: "1930", description: "Report online harassment & fraud" },
];

const HelplinesPage = () => {
  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-lg">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-foreground">Emergency Helplines</h1>
          <p className="text-sm text-muted-foreground mt-1">Tap to call directly from your device</p>
        </div>

        <div className="space-y-3">
          {helplines.map((line, i) => (
            <a
              key={line.number + line.name}
              href={`tel:${line.number.replace(/-/g, "")}`}
              className="glass-card-hover p-4 flex items-center justify-between opacity-0 animate-fade-in-up block"
              style={{ animationDelay: `${i * 0.05}s`, animationFillMode: "forwards" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-safe/15 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-safe" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{line.name}</p>
                  <p className="text-xs text-muted-foreground">{line.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-display font-bold text-primary">{line.number}</span>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </a>
          ))}
        </div>

        <div className="glass-card p-5 mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            If you are in <span className="text-primary font-medium">immediate danger</span>, please call{" "}
            <a href="tel:112" className="text-primary font-bold hover:underline">112</a> right away.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HelplinesPage;
