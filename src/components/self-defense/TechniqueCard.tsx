import { ChevronDown, ChevronUp, type LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Technique {
  title: string;
  situation: string;
  steps: string[];
  tip: string;
  icon: LucideIcon;
  color: string;
  image: string;
}

interface TechniqueCardProps {
  technique: Technique;
  isOpen: boolean;
  onToggle: () => void;
}

const TechniqueCard = ({ technique: tech, isOpen, onToggle }: TechniqueCardProps) => {
  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center gap-3 text-left"
      >
        <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
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

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Illustration */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.4, ease: "easeOut" }}
                className="rounded-xl overflow-hidden border border-border/50"
              >
                <img
                  src={tech.image}
                  alt={`${tech.title} illustration`}
                  className="w-full h-40 object-cover"
                  loading="lazy"
                />
              </motion.div>

              {/* Steps */}
              <div className="space-y-2">
                {tech.steps.map((step, si) => (
                  <motion.div
                    key={si}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 + si * 0.08, duration: 0.3 }}
                    className="flex items-start gap-2.5"
                  >
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {si + 1}
                    </span>
                    <p className="text-xs text-foreground leading-relaxed">{step}</p>
                  </motion.div>
                ))}
              </div>

              {/* Pro Tip */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.3 }}
                className="p-2.5 rounded-lg bg-primary/5 border border-primary/10"
              >
                <p className="text-[11px] text-primary font-medium">
                  💡 Pro Tip: {tech.tip}
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TechniqueCard;
