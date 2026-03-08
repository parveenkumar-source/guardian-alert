import { useState } from "react";
import { Shield, ChevronDown, ChevronUp, AlertTriangle, Zap, Hand, Target, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface Technique {
  title: string;
  situation: string;
  steps: string[];
  tip: string;
  icon: typeof Shield;
  color: string;
}

const techniques: Technique[] = [
  {
    title: "Wrist Grab Escape",
    situation: "When someone grabs your wrist",
    steps: [
      "Stay calm and don't pull away immediately",
      "Rotate your wrist toward the attacker's thumb (weakest point)",
      "Pull your arm sharply in the direction of their thumb gap",
      "Step back immediately and create distance",
      "Run toward a crowded or well-lit area",
    ],
    tip: "The thumb is always the weakest link in any grip. Rotate and pull toward it.",
    icon: Hand,
    color: "text-blue-500",
  },
  {
    title: "Palm Strike",
    situation: "When you need to defend at close range",
    steps: [
      "Open your hand with fingers slightly curved",
      "Keep your wrist locked and firm",
      "Strike upward toward the attacker's nose or chin using the heel of your palm",
      "Follow through with your body weight behind the strike",
      "Use the moment of shock to escape immediately",
    ],
    tip: "A palm strike is safer for your hand than a punch and equally effective.",
    icon: Zap,
    color: "text-amber-500",
  },
  {
    title: "Knee Strike",
    situation: "When the attacker is very close",
    steps: [
      "Grab the attacker's shoulders or clothing for leverage",
      "Drive your knee upward forcefully into their groin or midsection",
      "Use your hip thrust to add maximum power",
      "Push them away as they double over",
      "Sprint to safety while calling for help",
    ],
    tip: "This works best when the attacker is within arm's reach. Aim for the groin.",
    icon: Target,
    color: "text-rose-500",
  },
  {
    title: "Bear Hug Escape (From Behind)",
    situation: "When grabbed from behind with arms pinned",
    steps: [
      "Drop your weight immediately by bending your knees",
      "Tuck your chin to avoid a chokehold",
      "Stomp hard on the attacker's foot (aim for the instep)",
      "Drive your elbow backward into their ribs or solar plexus",
      "Turn and push away, then run",
    ],
    tip: "Dropping your center of gravity makes you much harder to hold.",
    icon: Shield,
    color: "text-purple-500",
  },
  {
    title: "Hair Grab Defense",
    situation: "When someone grabs your hair",
    steps: [
      "Immediately press both hands over the attacker's grabbing hand to reduce pain",
      "Push their hand firmly against your head (this neutralizes their leverage)",
      "Turn your body toward the attacker while keeping pressure on their hand",
      "Strike with your knee or stomp on their foot",
      "Once their grip loosens, break free and escape",
    ],
    tip: "Never pull away from a hair grab — it gives them more control. Press their hand down first.",
    icon: AlertTriangle,
    color: "text-orange-500",
  },
  {
    title: "Keys as Defensive Tool",
    situation: "Walking alone, feeling threatened",
    steps: [
      "Hold a key between your index and middle finger, poking out through your fist",
      "Keep your hand naturally by your side, ready",
      "If attacked, strike at sensitive areas: neck, eyes, or hands",
      "Use sharp jabbing motions, not wide swings",
      "Create distance and run immediately after striking",
    ],
    tip: "Your keys, water bottle, or bag strap can all serve as defensive tools in emergencies.",
    icon: Zap,
    color: "text-emerald-500",
  },
];

const categories = [
  { label: "All", value: "all" },
  { label: "Grab Escapes", value: "grab" },
  { label: "Strikes", value: "strike" },
  { label: "Close Range", value: "close" },
];

const SelfDefense = () => {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? techniques : techniques.filter((_, i) => {
    if (filter === "grab") return [0, 3, 4].includes(i);
    if (filter === "strike") return [1, 5].includes(i);
    if (filter === "close") return [2, 3].includes(i);
    return true;
  });

  return (
    <div className="min-h-screen pt-14 pb-20 md:pb-0">
      <div className="px-4 py-6 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/" className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Self-Defense Guide</h1>
            <p className="text-xs text-muted-foreground">Quick techniques for emergency situations</p>
          </div>
        </div>

        {/* Important disclaimer */}
        <div className="glass-card p-3 mb-4 border-l-4 border-l-amber-500">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Important:</strong> These are basic awareness techniques. Your safety is the priority — always try to escape and call for help first. Consider professional self-defense training for hands-on practice.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setFilter(cat.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filter === cat.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Techniques */}
        <div className="space-y-2.5">
          {filtered.map((tech, i) => {
            const realIdx = techniques.indexOf(tech);
            const isOpen = expandedIdx === realIdx;

            return (
              <div key={tech.title} className="glass-card overflow-hidden">
                <button
                  onClick={() => setExpandedIdx(isOpen ? null : realIdx)}
                  className="w-full p-4 flex items-center gap-3 text-left"
                >
                  <div className={`w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0`}>
                    <tech.icon className={`w-4.5 h-4.5 ${tech.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{tech.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{tech.situation}</p>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-3">
                    <div className="space-y-2">
                      {tech.steps.map((step, si) => (
                        <div key={si} className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {si + 1}
                          </span>
                          <p className="text-xs text-foreground leading-relaxed">{step}</p>
                        </div>
                      ))}
                    </div>

                    <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                      <p className="text-[11px] text-primary font-medium">
                        💡 Pro Tip: {tech.tip}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Emergency reminder */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-xs text-muted-foreground">In case of emergency, always call</p>
          <a
            href="tel:112"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-destructive text-white text-sm font-semibold hover:bg-destructive/90 transition-colors"
          >
            📞 Call 112
          </a>
        </div>
      </div>
    </div>
  );
};

export default SelfDefense;
