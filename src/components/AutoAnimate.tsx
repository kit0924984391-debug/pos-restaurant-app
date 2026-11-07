'use client';

import React, { ElementType } from 'react';
import { useAutoAnimateSafe } from '@/hooks/useAutoAnimateSafe';
import type { AutoAnimateOptions } from '@formkit/auto-animate';

interface AutoAnimateProps<T extends ElementType = 'div'> {
  as?: T;
  children: React.ReactNode;
  className?: string;
  options?: Partial<AutoAnimateOptions>;
}

/**
 * AutoAnimate Zero-Config Animation Wrapper
 * Automatically animates child additions, removals, and layout shifts (3.28 KB).
 */
export function AutoAnimate<T extends ElementType = 'div'>({
  as,
  children,
  className = '',
  options,
  ...rest
}: AutoAnimateProps<T> & React.ComponentPropsWithoutRef<T>) {
  const Component = as || 'div';
  const [ref] = useAutoAnimateSafe<HTMLElement>(options);

  return (
    <Component ref={ref as any} className={className} {...(rest as any)}>
      {children}
    </Component>
  );
}

export default AutoAnimate;
