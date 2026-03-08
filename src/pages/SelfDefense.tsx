import { useState } from "react";
import { Shield, AlertTriangle, Zap, Hand, Target, ArrowLeft, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

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
  const [search, setSearch] = useState("");

  const filtered = techniques.filter((tech, i) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "grab" && [0, 3, 4].includes(i)) ||
      (filter === "strike" && [1, 5].includes(i)) ||
      (filter === "close" && [2, 3].includes(i));

    const matchesSearch =
      !search ||
      tech.title.toLowerCase().includes(search.toLowerCase()) ||
      tech.situation.toLowerCase().includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen pt-14 pb-20 md:pb-6">
      <div className="px-4 py-6 max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3 mb-5"
        >
          <Link
            to="/"
            className="p-2.5 rounded-xl bg-secondary/80 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </Link>
          <div className="flex-1">
            <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              Self-Defense Guide
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Quick techniques for emergency situations
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-medium text-primary">{techniques.length} Techniques</span>
          </div>
        </motion.div>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="glass-card p-3.5 mb-5 border-l-4 border-l-amber-500"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Important:</strong> These are basic awareness techniques.
              Your safety is the priority — always try to escape and call for help first.
              Consider professional self-defense training for hands-on practice.
            </p>
          </div>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="relative mb-4"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search techniques..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-secondary/60 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:bg-secondary/80 transition-all"
          />
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-none"
        >
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setFilter(cat.value)}
              className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all active:scale-95 ${
                filter === cat.value
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/30"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </motion.div>

        {/* Techniques Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((tech, i) => {
            const realIdx = techniques.indexOf(tech);
            const isOpen = expandedIdx === realIdx;

            return (
              <motion.div
                key={tech.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.4 }}
                className={isOpen ? "sm:col-span-2" : ""}
              >
                <TechniqueCard
                  technique={tech}
                  isOpen={isOpen}
                  onToggle={() => setExpandedIdx(isOpen ? null : realIdx)}
                />
              </motion.div>
            );
          })}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Search className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No techniques found</p>
            <button
              onClick={() => { setSearch(""); setFilter("all"); }}
              className="mt-2 text-xs text-primary hover:underline"
            >
              Clear filters
            </button>
          </motion.div>
        )}

        {/* Emergency reminder */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="mt-8 glass-card p-5 text-center space-y-3"
        >
          <p className="text-xs text-muted-foreground">In case of emergency, always call</p>
          <a
            href="tel:112"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-all active:scale-95 shadow-lg shadow-destructive/20"
          >
            📞 Call 112
          </a>
          <p className="text-[10px] text-muted-foreground/60">
            Your safety is always the first priority
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default SelfDefense;
