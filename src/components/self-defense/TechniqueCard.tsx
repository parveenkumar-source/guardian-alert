import { useState } from "react";
import { ChevronDown, Image, Play, type LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedDemo from "./AnimatedDemo";

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
    <div className={`glass-card overflow-hidden transition-all duration-300 ${isOpen ? "ring-1 ring-primary/20 shadow-lg shadow-primary/5" : "hover:border-border/60"}`}>
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center gap-3 text-left active:bg-secondary/30 transition-colors"
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isOpen ? "bg-primary/15" : "bg-secondary"}`}>
          <tech.icon className={`w-5 h-5 ${tech.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">{tech.title}</p>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">{tech.situation}</p>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronDown className={`w-4 h-4 transition-colors ${isOpen ? "text-primary" : "text-muted-foreground"}`} />
        </motion.div>
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
            <div className="px-4 pb-4 space-y-4">
              {/* Illustration */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.4, ease: "easeOut" }}
                className="rounded-xl overflow-hidden border border-border/40 bg-secondary/30"
              >
                <img
                  src={tech.image}
                  alt={`${tech.title} illustration`}
                  className="w-full h-44 sm:h-52 object-cover"
                  loading="lazy"
                />
              </motion.div>

              {/* Steps */}
              <div className="space-y-2.5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                  Step-by-step
                </p>
                {tech.steps.map((step, si) => (
                  <motion.div
                    key={si}
                    initial={{ x: -16, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.15 + si * 0.07, duration: 0.3 }}
                    className="flex items-start gap-3 group"
                  >
                    <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary/20 transition-colors">
                      {si + 1}
                    </span>
                    <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">{step}</p>
                  </motion.div>
                ))}
              </div>

              {/* Pro Tip */}
              <motion.div
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.3 }}
                className="p-3 rounded-xl bg-primary/5 border border-primary/10"
              >
                <p className="text-[11px] sm:text-xs text-primary font-medium leading-relaxed">
                  💡 <span className="font-semibold">Pro Tip:</span> {tech.tip}
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
