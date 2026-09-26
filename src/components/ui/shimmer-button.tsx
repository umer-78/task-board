// Shimmer Button — adapted from Magic UI (magicui.design, listed on 21st.dev), MIT licence.
// A light sweep crosses the button; the sweep is pure CSS and stops for reduced motion.
import type { ButtonHTMLAttributes } from 'react';

export function ShimmerButton({ className = '', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`shimmer-button ${className}`.trim()} {...props}>
      <span className="shimmer-button__sweep" aria-hidden="true" />
      <span className="shimmer-button__label">{children}</span>
    </button>
  );
}
