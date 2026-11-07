'use client';

import React from 'react';
import { MotionConfig } from 'framer-motion';

interface MotionConfigProviderProps {
  children: React.ReactNode;
}

/**
 * Universal Motion Configuration Provider
 * - Respects system "prefers-reduced-motion" settings automatically for WCAG 2.2 AA compliance.
 * - Standardizes transition defaults across client components.
 */
export function MotionConfigProvider({ children }: MotionConfigProviderProps) {
  return (
    <MotionConfig reducedMotion="user">
      {children}
    </MotionConfig>
  );
}

export default MotionConfigProvider;
