'use client';

import * as React from 'react';
import { Dialog as BaseUIDialog } from '@base-ui-components/react/dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Dialog = BaseUIDialog;
export const DialogRoot = BaseUIDialog.Root;
export const DialogTrigger = BaseUIDialog.Trigger;
export const DialogPortal = BaseUIDialog.Portal;
export const DialogBackdrop = BaseUIDialog.Backdrop;
export const DialogPopup = BaseUIDialog.Popup;
export const DialogTitle = BaseUIDialog.Title;
export const DialogDescription = BaseUIDialog.Description;
export const DialogClose = BaseUIDialog.Close;

export interface BaseDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
}

/**
 * Standard Accessible Modal Dialog built with Base UI and Tailwind CSS.
 * Provides focus management, backdrop blur, ESC key dismiss, and WAI-ARIA compliance.
 */
export function BaseDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  showCloseButton = true,
}: BaseDialogProps) {
  return (
    <BaseUIDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseUIDialog.Portal>
        <BaseUIDialog.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-200" />
        <BaseUIDialog.Popup
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-2rem)] sm:w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6',
            'bg-card text-card-foreground rounded-2xl border border-border shadow-2xl',
            'focus:outline-none transition-all duration-200',
            className
          )}
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="space-y-1">
              {title && (
                <BaseUIDialog.Title className="text-lg font-bold tracking-tight text-foreground">
                  {title}
                </BaseUIDialog.Title>
              )}
              {description && (
                <BaseUIDialog.Description className="text-sm text-muted-foreground">
                  {description}
                </BaseUIDialog.Description>
              )}
            </div>
            {showCloseButton && (
              <BaseUIDialog.Close
                className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </BaseUIDialog.Close>
            )}
          </div>
          <div>{children}</div>
        </BaseUIDialog.Popup>
      </BaseUIDialog.Portal>
    </BaseUIDialog.Root>
  );
}
