'use client';

import React, { useEffect, useRef, useState } from 'react';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'fade' | 'zoom';
  delay?: number; // in milliseconds
  duration?: number; // in milliseconds
  threshold?: number;
  distance?: number; // travel distance in px (auto-calibrated: 24px mobile, 36px tablet/PC)
  fadeOutOnExit?: boolean; // default false for permanent reveal
  once?: boolean; // default true so elements stay visible
}

/**
 * High-Fidelity Universal Scroll Reveal Component
 * - Fully calibrated for Mobile, Tablet, and Desktop PC.
 * - Staggered cascade: animates elements one by one with distinct, elegant vertical rise.
 * - Entrance animation: elements above the fold smoothly fade in on initial load rather than jumping statically.
 * - 60fps GPU acceleration: uses translate3d and Apple-standard spring deceleration curve.
 */
export default function ScrollReveal({
  children,
  className = '',
  direction = 'up',
  delay = 0,
  duration,
  threshold = 0.08,
  distance,
  fadeOutOnExit = false,
  once = true,
}: ScrollRevealProps) {
  const domRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [effectiveDistance, setEffectiveDistance] = useState(distance ?? 28);

  useEffect(() => {
    // Check user preference for reduced motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReducedMotion(true);
      setIsVisible(true);
      return;
    }

    // Adaptive travel distance: 24px on mobile, 36px on tablet/PC for clear visual distinction
    if (distance === undefined && typeof window !== 'undefined') {
      setEffectiveDistance(window.innerWidth >= 768 ? 36 : 24);
    }

    const el = domRef.current;
    if (!el) return;

    // Check if element is already in the initial viewport
    const rect = el.getBoundingClientRect();
    const windowH = window.innerHeight || document.documentElement.clientHeight;
    const isInInitialView = rect.top < windowH && rect.bottom > 0;

    if (isInInitialView) {
      // Trigger a graceful entrance animation on mount with staggered delay
      const initialTimer = setTimeout(() => {
        setIsVisible(true);
      }, Math.max(delay, 40));
      return () => clearTimeout(initialTimer);
    }

    // Elements below the fold: observe scroll with comfortable trigger margin
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (once) {
              observer.unobserve(entry.target);
            }
          } else if (!once && !fadeOutOnExit) {
            setIsVisible(false);
          }
        });
      },
      {
        threshold,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, once, fadeOutOnExit, delay, distance]);

  // If user requests reduced motion, render immediately without animations
  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  const effectiveDuration = duration !== undefined ? duration : 580;

  // GPU-accelerated transforms
  const getTransform = () => {
    if (isVisible) return 'translate3d(0, 0, 0) scale(1)';

    switch (direction) {
      case 'left':
        return `translate3d(-${effectiveDistance}px, 0, 0)`;
      case 'right':
        return `translate3d(${effectiveDistance}px, 0, 0)`;
      case 'down':
        return `translate3d(0, -${effectiveDistance}px, 0)`;
      case 'zoom':
        return 'scale(0.95)';
      case 'fade':
        return 'translate3d(0, 0, 0)';
      case 'up':
      default:
        return `translate3d(0, ${effectiveDistance}px, 0)`;
    }
  };

  return (
    <div
      ref={domRef}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: getTransform(),
        transition: `opacity ${effectiveDuration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${effectiveDuration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        willChange: 'opacity, transform',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
      }}
      className={className}
    >
      {children}
    </div>
  );
}
