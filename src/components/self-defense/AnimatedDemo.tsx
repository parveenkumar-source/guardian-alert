import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

interface AnimatedDemoProps {
  image: string;
  title: string;
  steps: string[];
}

const STEP_DURATION = 3500;

const AnimatedDemo = ({ image, title, steps }: AnimatedDemoProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  const totalSteps = steps.length;
  const isLastStep = currentStep === totalSteps - 1;

  const goNext = useCallback(() => {
    if (isLastStep) {
      setIsPlaying(false);
      setProgress(100);
    } else {
      setCurrentStep((s) => s + 1);
      setProgress(0);
    }
  }, [isLastStep]);

  const goPrev = useCallback(() => {
    setCurrentStep((s) => Math.max(0, s - 1));
    setProgress(0);
    setIsPlaying(true);
  }, []);

  const restart = useCallback(() => {
    setCurrentStep(0);
    setProgress(0);
    setIsPlaying(true);
  }, []);

  // Auto-advance timer
  useEffect(() => {
    if (!isPlaying) return;

    const interval = 50;
    const increment = (interval / STEP_DURATION) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          goNext();
          return 0;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, currentStep, goNext]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-border/40 bg-secondary/30 select-none">
      {/* Base image */}
      <img
        src={image}
        alt={`${title} demonstration`}
        className="w-full h-44 sm:h-52 object-cover"
        loading="lazy"
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

      {/* Step number badge */}
      <motion.div
        key={`badge-${currentStep}`}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className="absolute top-3 left-3 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30"
      >
        <span className="text-xs font-bold text-primary-foreground">
          {currentStep + 1}
        </span>
      </motion.div>

      {/* Step counter */}
      <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm">
        <span className="text-[10px] font-medium text-white/80">
          {currentStep + 1} / {totalSteps}
        </span>
      </div>

      {/* Step text overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-3 pt-6">
        <AnimatePresence mode="wait">
          <motion.p
            key={currentStep}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="text-xs sm:text-sm text-white font-medium leading-relaxed mb-2.5"
          >
            {steps[currentStep]}
          </motion.p>
        </AnimatePresence>

        {/* Progress bar + controls */}
        <div className="flex items-center gap-2">
          {/* Progress dots */}
          <div className="flex gap-1 flex-1">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setCurrentStep(i);
                  setProgress(0);
                  setIsPlaying(true);
                }}
                className="relative h-1 flex-1 rounded-full overflow-hidden bg-white/20 transition-colors"
              >
                {i < currentStep && (
                  <div className="absolute inset-0 bg-primary rounded-full" />
                )}
                {i === currentStep && (
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-primary rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={goPrev}
              disabled={currentStep === 0}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>

            {isLastStep && !isPlaying ? (
              <button
                onClick={restart}
                className="p-1.5 rounded-full bg-primary/80 hover:bg-primary text-primary-foreground transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            ) : (
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-3 h-3" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
              </button>
            )}

            <button
              onClick={goNext}
              disabled={isLastStep}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimatedDemo;
