'use client';

import * as React from 'react';
import { Tooltip as BaseUITooltip } from '@base-ui-components/react/tooltip';
import { cn } from '@/lib/utils';

export const Tooltip = BaseUITooltip;
export const TooltipRoot = BaseUITooltip.Root;
export const TooltipTrigger = BaseUITooltip.Trigger;
export const TooltipPortal = BaseUITooltip.Portal;
export const TooltipPositioner = BaseUITooltip.Positioner;
export const TooltipPopup = BaseUITooltip.Popup;
export const TooltipArrow = BaseUITooltip.Arrow;
export const TooltipProvider = BaseUITooltip.Provider;

export interface BaseTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
  delay?: number;
  className?: string;
}

/**
 * Accessible Tooltip using Base UI and Floating UI positioning.
 */
export function BaseTooltip({
  content,
  children,
  side = 'top',
  sideOffset = 6,
  delay = 200,
  className,
}: BaseTooltipProps) {
  return (
    <BaseUITooltip.Root delay={delay} {...({} as any)}>
      <BaseUITooltip.Trigger render={(props) => <span {...props} className="inline-flex">{children}</span>} />
      <BaseUITooltip.Portal>
        <BaseUITooltip.Positioner side={side} sideOffset={sideOffset} className="z-50">
          <BaseUITooltip.Popup
            className={cn(
              'px-2.5 py-1.5 text-xs font-medium rounded-lg shadow-md',
              'bg-slate-900 text-slate-100 border border-slate-800',
              'animate-in fade-in-0 zoom-in-95 duration-150',
              className
            )}
          >
            {content}
            <BaseUITooltip.Arrow className="w-2 h-2 rotate-45 bg-slate-900 border-r border-b border-slate-800" />
          </BaseUITooltip.Popup>
        </BaseUITooltip.Positioner>
      </BaseUITooltip.Portal>
    </BaseUITooltip.Root>
  );
}
