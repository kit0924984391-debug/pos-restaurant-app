'use client';

import React from 'react';
import {
  motion,
  AnimatePresence,
  HTMLMotionProps,
  Variants,
} from 'framer-motion';

export { motion, AnimatePresence };

/**
 * Spring physics presets calibrated for natural tactile feel
 */
export const MOTION_SPRINGS = {
  snappy: { type: 'spring', stiffness: 400, damping: 25 },
  smooth: { type: 'spring', stiffness: 260, damping: 20 },
  bouncy: { type: 'spring', stiffness: 350, damping: 15 },
  gentle: { type: 'spring', stiffness: 180, damping: 24 },
} as const;

/**
 * MotionButton: Interactive button with micro-interactions
 * Provides tactile scale-up on hover and press-down bounce on tap.
 */
export interface MotionButtonProps extends HTMLMotionProps<'button'> {
  children: React.ReactNode;
  haptic?: boolean;
}

export const MotionButton = React.forwardRef<HTMLButtonElement, MotionButtonProps>(
  ({ children, className = '', whileHover, whileTap, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={whileHover ?? { scale: 1.02 }}
        whileTap={whileTap ?? { scale: 0.97 }}
        transition={MOTION_SPRINGS.snappy}
        className={className}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);
MotionButton.displayName = 'MotionButton';

/**
 * MotionCard: Interactive elevation card
 * Smoothly lifts up on hover using spring physics.
 */
export interface MotionCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  liftDistance?: number;
}

export const MotionCard = React.forwardRef<HTMLDivElement, MotionCardProps>(
  ({ children, className = '', liftDistance = 4, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={{
          y: -liftDistance,
          transition: MOTION_SPRINGS.smooth,
        }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
MotionCard.displayName = 'MotionCard';

/**
 * MotionFadeIn: Viewport scroll-triggered element
 * Fades and slides into view smoothly as user scrolls.
 */
export interface MotionFadeInProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  delay?: number;
  duration?: number;
  distance?: number;
  once?: boolean;
}

export function MotionFadeIn({
  children,
  className = '',
  direction = 'up',
  delay = 0,
  duration = 0.5,
  distance = 24,
  once = true,
  ...props
}: MotionFadeInProps) {
  const getInitialPosition = () => {
    switch (direction) {
      case 'up':
        return { y: distance, x: 0 };
      case 'down':
        return { y: -distance, x: 0 };
      case 'left':
        return { x: distance, y: 0 };
      case 'right':
        return { x: -distance, y: 0 };
      case 'none':
      default:
        return { x: 0, y: 0 };
    }
  };

  const initialOffset = getInitialPosition();

  return (
    <motion.div
      initial={{ opacity: 0, ...initialOffset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once }}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Stagger Container and Item for sequential list reveals
 */
export const STAGGER_CONTAINER_VARIANTS: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

export const STAGGER_ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export function MotionStagger({
  children,
  className = '',
  ...props
}: HTMLMotionProps<'div'>) {
  return (
    <motion.div
      variants={STAGGER_CONTAINER_VARIANTS}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function MotionStaggerItem({
  children,
  className = '',
  ...props
}: HTMLMotionProps<'div'>) {
  return (
    <motion.div
      variants={STAGGER_ITEM_VARIANTS}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
