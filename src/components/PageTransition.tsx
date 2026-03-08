import { motion } from "framer-motion";
import { ReactNode } from "react";

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  enter: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const pageTransition = {
  type: "tween" as const,
  ease: "easeOut" as const,
  duration: 0.25,
};

const PageTransition = ({ children }: { children: ReactNode }) => (
  <motion.div
    initial="initial"
    animate="enter"
    exit="exit"
    variants={pageVariants}
    transition={pageTransition}
  >
    {children}
  </motion.div>
);

export default PageTransition;
