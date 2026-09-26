// Blur Fade — adapted from Magic UI (magicui.design, listed on 21st.dev), MIT licence.
// Tailwind classes replaced with plain props so it fits this project's CSS.
import { useRef, type ReactNode } from 'react';
import { motion, useInView, type Variants } from 'motion/react';

interface BlurFadeProps {
  children: ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
  offset?: number;
  inView?: boolean;
  blur?: string;
}

export function BlurFade({ children, className, duration = 0.45, delay = 0, offset = 8, inView = false, blur = '6px' }: BlurFadeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: '-40px' });
  const show = !inView || seen;
  const variants: Variants = {
    hidden: { y: offset, opacity: 0, filter: `blur(${blur})` },
    visible: { y: 0, opacity: 1, filter: 'blur(0px)' },
  };
  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={show ? 'visible' : 'hidden'}
      variants={variants}
      transition={{ delay: 0.04 + delay, duration, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
