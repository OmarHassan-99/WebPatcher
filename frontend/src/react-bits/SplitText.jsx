import { motion as Motion } from "framer-motion";

const SplitText = ({
  text,
  className = "",
  delay = 50,
  duration = 0.5,
  from = { opacity: 0, y: 20 },
  to = { opacity: 1, y: 0 },
  onLetterAnimationComplete,
}) => {
  const letters = text.split("");

  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: delay / 1000, delayChildren: 0.04 * i },
    }),
  };

  const child = {
    visible: {
      ...to,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 100,
        duration: duration,
      },
    },
    hidden: {
      ...from,
    },
  };

  return (
    <Motion.span
      style={{ display: "inline-block", overflow: "hidden" }}
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      className={className}
      onAnimationComplete={onLetterAnimationComplete}
    >
      {letters.map((char, index) => (
        <Motion.span
          key={index}
          variants={child}
          style={{ display: "inline-block", whiteSpace: "pre" }}
        >
          {char}
        </Motion.span>
      ))}
    </Motion.span>
  );
};

export default SplitText;
