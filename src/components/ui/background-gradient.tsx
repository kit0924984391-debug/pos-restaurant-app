'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

/**
 * Aceternity UI - Background Gradient Component
 * Renders an animated rotating/shifting radiant gradient border.
 */
export const BackgroundGradient = ({
  children,
  className,
  containerClassName,
  animate = true,
}: {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  animate?: boolean;
}) => {
  const variants = {
    initial: {
      backgroundPosition: '0 50%',
    },
    animate: {
      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
    },
  };

  return (
    <div className={cn('relative p-[2px] sm:p-[3px] group', containerClassName)}>
      <motion.div
        variants={animate ? variants : undefined}
        initial={animate ? 'initial' : undefined}
        animate={animate ? 'animate' : undefined}
        transition={
          animate
            ? {
                duration: 6,
                repeat: Infinity,
                repeatType: 'reverse',
                ease: 'easeInOut',
              }
            : undefined
        }
        style={{
          backgroundSize: '300% 300%',
        }}
        className={cn(
          'absolute inset-0 rounded-3xl z-[1] opacity-50 group-hover:opacity-100 blur-xl transition duration-500 will-change-transform',
          'bg-[radial-gradient(circle_farthest-side_at_0_100%,#f97316,transparent),radial-gradient(circle_farthest-side_at_100%_0,#f59e0b,transparent),radial-gradient(circle_farthest-side_at_100%_100%,#ea580c,transparent),radial-gradient(circle_farthest-side_at_0_0,#fb923c,#f97316)]'
        )}
      />
      <motion.div
        variants={animate ? variants : undefined}
        initial={animate ? 'initial' : undefined}
        animate={animate ? 'animate' : undefined}
        transition={
          animate
            ? {
                duration: 6,
                repeat: Infinity,
                repeatType: 'reverse',
                ease: 'easeInOut',
              }
            : undefined
        }
        style={{
          backgroundSize: '300% 300%',
        }}
        className={cn(
          'absolute inset-0 rounded-3xl z-[1] will-change-transform',
          'bg-[radial-gradient(circle_farthest-side_at_0_100%,#f97316,transparent),radial-gradient(circle_farthest-side_at_100%_0,#f59e0b,transparent),radial-gradient(circle_farthest-side_at_100%_100%,#ea580c,transparent),radial-gradient(circle_farthest-side_at_0_0,#fb923c,#f97316)]'
        )}
      />
      <div className={cn('relative z-10', className)}>{children}</div>
    </div>
  );
};

export default BackgroundGradient;
