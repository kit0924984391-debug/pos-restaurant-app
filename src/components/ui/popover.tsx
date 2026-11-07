'use client';

import * as React from 'react';
import { Popover as BaseUIPopover } from '@base-ui-components/react/popover';
import { cn } from '@/lib/utils';

export const Popover = BaseUIPopover;
export const PopoverRoot = BaseUIPopover.Root;
export const PopoverTrigger = BaseUIPopover.Trigger;
export const PopoverPortal = BaseUIPopover.Portal;
export const PopoverPositioner = BaseUIPopover.Positioner;
export const PopoverPopup = BaseUIPopover.Popup;
export const PopoverTitle = BaseUIPopover.Title;
export const PopoverDescription = BaseUIPopover.Description;
export const PopoverClose = BaseUIPopover.Close;
export const PopoverArrow = BaseUIPopover.Arrow;
export const PopoverBackdrop = BaseUIPopover.Backdrop;

export interface BasePopoverProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
  className?: string;
}

/**
 * Accessible Popover component built with Base UI and Floating UI positioning.
 */
export function BasePopover({
  trigger,
  children,
  side = 'bottom',
  sideOffset = 8,
  className,
}: BasePopoverProps) {
  return (
    <BaseUIPopover.Root>
      <BaseUIPopover.Trigger render={(props) => <span {...props} className="inline-flex">{trigger}</span>} />
      <BaseUIPopover.Portal>
        <BaseUIPopover.Positioner side={side} sideOffset={sideOffset} className="z-50">
          <BaseUIPopover.Popup
            className={cn(
              'w-72 p-4 rounded-xl shadow-xl bg-card text-card-foreground border border-border',
              'focus:outline-none animate-in fade-in-0 zoom-in-95 duration-150',
              className
            )}
          >
            {children}
            <BaseUIPopover.Arrow className="w-2.5 h-2.5 rotate-45 bg-card border-r border-b border-border" />
          </BaseUIPopover.Popup>
        </BaseUIPopover.Positioner>
      </BaseUIPopover.Portal>
    </BaseUIPopover.Root>
  );
}
