import { useState } from "react";
import { Shield, ChevronDown, ChevronUp, AlertTriangle, Zap, Hand, Target, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import wristGrabImg from "@/assets/self-defense/wrist-grab.png";
import palmStrikeImg from "@/assets/self-defense/palm-strike.png";
import kneeStrikeImg from "@/assets/self-defense/knee-strike.png";
import bearHugImg from "@/assets/self-defense/bear-hug.png";
import hairGrabImg from "@/assets/self-defense/hair-grab.png";
import keysDefenseImg from "@/assets/self-defense/keys-defense.png";

import TechniqueCard from "@/components/self-defense/TechniqueCard";

interface Technique {
  title: string;
  situation: string;
  steps: string[];
  tip: string;
  icon: typeof Shield;
  color: string;
  image: string;
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
    image: wristGrabImg,
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
    image: palmStrikeImg,
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
    image: kneeStrikeImg,
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
    image: bearHugImg,
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
    image: hairGrabImg,
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
    image: keysDefenseImg,
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
          {filtered.map((tech) => {
            const realIdx = techniques.indexOf(tech);
            const isOpen = expandedIdx === realIdx;

            return (
              <TechniqueCard
                key={tech.title}
                technique={tech}
                isOpen={isOpen}
                onToggle={() => setExpandedIdx(isOpen ? null : realIdx)}
              />
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
