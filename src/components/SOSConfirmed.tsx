import { CheckCircle, MapPin, Share2 } from "lucide-react";
import { getContacts, generateSOSMessage } from "@/lib/contacts";

interface SOSConfirmedProps {
  location: { latitude: number; longitude: number } | null;
  onDismiss: () => void;
}

const SOSConfirmed = ({ location, onDismiss }: SOSConfirmedProps) => {
  const contacts = getContacts();
  const message = location
    ? generateSOSMessage(location.latitude, location.longitude)
    : "🚨 EMERGENCY SOS ALERT! I need immediate help!";

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "SOS Alert", text: message });
      } catch {}
    } else {
      navigator.clipboard.writeText(message);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-xl">
      <div className="flex flex-col items-center gap-6 p-8 max-w-sm w-full text-center">
        <div className="w-20 h-20 rounded-full bg-safe/20 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-safe" />
        </div>

        <div className="space-y-2">
          <h2 className="font-display text-2xl font-bold text-foreground">SOS Alert Sent!</h2>
          <p className="text-muted-foreground text-sm">
            Emergency alerts have been prepared for {contacts.length} contact{contacts.length !== 1 ? "s" : ""}.
          </p>
        </div>

        {location && (
          <div className="glass-card p-4 w-full">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <span className="text-muted-foreground">
                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </span>
            </div>
            <a
              href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline mt-2 inline-block"
            >
              Open in Google Maps →
            </a>
          </div>
        )}

        <div className="glass-card p-4 w-full text-left">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Alert Message:</p>
          <p className="text-xs text-foreground/80 whitespace-pre-line">{message}</p>
        </div>

        <div className="flex gap-3 w-full">
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm transition-colors hover:bg-primary/90"
          >
            <Share2 className="w-4 h-4" />
            Share Alert
          </button>
          <button
            onClick={onDismiss}
            className="flex-1 px-4 py-3 rounded-lg bg-secondary text-secondary-foreground font-medium text-sm transition-colors hover:bg-secondary/80"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default SOSConfirmed;
