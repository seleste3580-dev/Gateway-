import { motion } from "motion/react";
import React from "react";

export const CircuitBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 bg-bg-dark overflow-hidden pointer-events-none opacity-40">
      <svg className="w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
        {/* Horizontal Lines */}
        {[100, 300, 500, 700, 900].map((y, i) => (
          <motion.line
            key={`h-${i}`}
            x1="0"
            y1={y}
            x2="1000"
            y2={y}
            stroke="var(--color-primary)"
            strokeWidth="0.5"
            initial={{ pathLength: 0, opacity: 0.1 }}
            animate={{ 
              pathLength: [0, 1, 1, 0],
              opacity: [0.1, 0.3, 0.1]
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              delay: i * 2,
              ease: "linear"
            }}
          />
        ))}

        {/* Vertical Lines */}
        {[100, 300, 500, 700, 900].map((x, i) => (
          <motion.line
            key={`v-${i}`}
            x1={x}
            y1="0"
            x2={x}
            y2="1000"
            stroke="var(--color-secondary)"
            strokeWidth="0.5"
            initial={{ pathLength: 0, opacity: 0.1 }}
            animate={{ 
              pathLength: [0, 1, 1, 0],
              opacity: [0.1, 0.3, 0.1]
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              delay: i * 2,
              ease: "linear"
            }}
          />
        ))}

        {/* Pulsing Nodes */}
        {[
          [100, 100], [300, 300], [500, 100], [700, 500], [900, 900],
          [100, 500], [500, 700], [300, 900], [700, 100], [900, 300]
        ].map(([x, y], i) => (
          <React.Fragment key={`node-${i}`}>
            <motion.circle
              cx={x}
              cy={y}
              r="2"
              fill="var(--color-primary)"
              animate={{
                r: [2, 4, 2],
                opacity: [0.3, 1, 0.3]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.5
              }}
            />
            <motion.circle
              cx={x}
              cy={y}
              r="6"
              stroke="var(--color-primary)"
              strokeWidth="0.5"
              fill="none"
              animate={{
                r: [6, 12, 6],
                opacity: [0.1, 0, 0.1]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.5
              }}
            />
          </React.Fragment>
        ))}
      </svg>
      
      {/* Varnish/Scanline effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none" />
    </div>
  );
};
