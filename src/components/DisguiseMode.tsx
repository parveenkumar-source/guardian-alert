import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DisguiseModeProps {
  onExit: () => void;
}

const DisguiseMode = ({ onExit }: DisguiseModeProps) => {
  const [display, setDisplay] = useState("0");
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [exitTaps, setExitTaps] = useState(0);

  // Triple tap on display to exit disguise
  useEffect(() => {
    if (exitTaps >= 5) {
      onExit();
    }
    const timer = setTimeout(() => setExitTaps(0), 1500);
    return () => clearTimeout(timer);
  }, [exitTaps, onExit]);

  const inputDigit = useCallback((digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? digit : display + digit);
    }
  }, [display, waitingForOperand]);

  const inputDot = useCallback(() => {
    if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  }, [display]);

  const clear = useCallback(() => {
    setDisplay("0");
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  }, []);

  const performOperation = useCallback((nextOp: string) => {
    const current = parseFloat(display);

    if (prevValue !== null && operator && !waitingForOperand) {
      let result = prevValue;
      switch (operator) {
        case "+": result = prevValue + current; break;
        case "-": result = prevValue - current; break;
        case "×": result = prevValue * current; break;
        case "÷": result = current !== 0 ? prevValue / current : 0; break;
      }
      setDisplay(String(parseFloat(result.toFixed(8))));
      setPrevValue(result);
    } else {
      setPrevValue(current);
    }

    setOperator(nextOp === "=" ? null : nextOp);
    setWaitingForOperand(true);
  }, [display, prevValue, operator, waitingForOperand]);

  const toggleSign = useCallback(() => {
    const val = parseFloat(display);
    setDisplay(String(-val));
  }, [display]);

  const percentage = useCallback(() => {
    const val = parseFloat(display);
    setDisplay(String(val / 100));
  }, [display]);

  const buttons = [
    ["C", "±", "%", "÷"],
    ["7", "8", "9", "×"],
    ["4", "5", "6", "-"],
    ["1", "2", "3", "+"],
    ["0", ".", "="],
  ];

  const handleButton = (btn: string) => {
    switch (btn) {
      case "C": clear(); break;
      case "±": toggleSign(); break;
      case "%": percentage(); break;
      case "+": case "-": case "×": case "÷": case "=":
        performOperation(btn); break;
      case ".": inputDot(); break;
      default: inputDigit(btn); break;
    }
  };

  const isOperator = (btn: string) => ["+", "-", "×", "÷", "="].includes(btn);
  const isFunction = (btn: string) => ["C", "±", "%"].includes(btn);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black flex flex-col"
      >
        {/* Display */}
        <div
          className="flex-1 flex items-end justify-end p-6 pb-4 cursor-pointer select-none"
          onClick={() => setExitTaps((t) => t + 1)}
        >
          <p
            className="text-white font-light tracking-tight"
            style={{
              fontSize: display.length > 9 ? "2.5rem" : display.length > 6 ? "3.5rem" : "4.5rem",
            }}
          >
            {display}
          </p>
        </div>

        {/* Buttons */}
        <div className="p-3 pb-8 space-y-2.5">
          {buttons.map((row, ri) => (
            <div key={ri} className="flex gap-2.5 justify-center">
              {row.map((btn) => (
                <button
                  key={btn}
                  onClick={() => handleButton(btn)}
                  className={`
                    ${btn === "0" ? "flex-[2] px-6" : "w-[72px]"} 
                    h-[72px] rounded-full text-2xl font-medium
                    flex items-center ${btn === "0" ? "justify-start pl-7" : "justify-center"}
                    transition-all duration-100 active:scale-95 active:opacity-70
                    ${isOperator(btn)
                      ? "bg-orange-500 text-white active:bg-orange-400"
                      : isFunction(btn)
                        ? "bg-neutral-700 text-white active:bg-neutral-600"
                        : "bg-neutral-800 text-white active:bg-neutral-700"
                    }
                  `}
                >
                  {btn}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Hidden exit hint */}
        <div className="absolute bottom-2 left-0 right-0 text-center">
          <p className="text-neutral-800 text-[9px]">
            Tap display 5× to exit
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DisguiseMode;
