'use client';

import { useEffect, useRef, useState } from 'react';
import type { AutoAnimateOptions, AutoAnimationPlugin } from '@formkit/auto-animate';

/**
 * SSR-Safe AutoAnimate Hook for Next.js App Router & Cloudflare Workers
 * - Client-only dynamic execution to avoid Node.js SSR DOM errors
 * - Automatically respects prefers-reduced-motion
 * - Works seamlessly on list additions, removals, and reordering
 */
export function useAutoAnimateSafe<T extends HTMLElement>(
  options?: Partial<AutoAnimateOptions> | AutoAnimationPlugin
) {
  const elementRef = useRef<T | null>(null);
  const [controller, setController] = useState<{ enable: () => void; disable: () => void; isEnabled: () => boolean } | null>(null);

  useEffect(() => {
    let active = true;

    if (typeof window !== 'undefined' && elementRef.current) {
      import('@formkit/auto-animate').then(({ default: autoAnimate }) => {
        if (active && elementRef.current) {
          const ctrl = autoAnimate(elementRef.current, options || { duration: 250, easing: 'ease-in-out' });
          setController(ctrl);
        }
      }).catch(() => {
        // Graceful fallback if animation is unsupported
      });
    }

    return () => {
      active = false;
      if (controller) {
        controller.disable();
      }
    };
  }, [options]);

  return [elementRef, controller] as const;
}

export default useAutoAnimateSafe;
