// Number Ticker — adapted from Magic UI (magicui.design, listed on 21st.dev), MIT licence.
// Springs from the previous value to the new one; renders the final value for
// screen readers and reduced-motion users straight away.
import { useEffect, useRef } from 'react';
import { MotionGlobalConfig, useInView, useMotionValue, useReducedMotion, useSpring } from 'motion/react';

interface NumberTickerProps {
  value: number;
  className?: string;
  decimalPlaces?: number;
}

export function NumberTicker({ value, className, decimalPlaces = 0 }: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion() || MotionGlobalConfig.skipAnimations;
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { damping: 60, stiffness: 180 });
  const isInView = useInView(ref, { once: true, margin: '0px' });
  const format = (v: number) => Intl.NumberFormat('en-US', { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces }).format(Number(v.toFixed(decimalPlaces)));

  useEffect(() => {
    if (reduce) { if (ref.current) ref.current.textContent = format(value); return; }
    if (isInView) motionValue.set(value);
  }, [motionValue, isInView, value, reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => spring.on('change', (latest) => {
    if (ref.current) ref.current.textContent = format(latest);
  }), [spring]); // eslint-disable-line react-hooks/exhaustive-deps

  return <span ref={ref} className={className} aria-label={format(value)}>{format(reduce ? value : 0)}</span>;
}
