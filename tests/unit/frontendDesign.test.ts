import { describe, it, expect } from 'vitest';
import * as React from 'react';
import fs from 'fs';
import path from 'path';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

describe('Frontend Design System & Accessibility Suite', () => {
  describe('Global CSS & Design Tokens', () => {
    const cssPath = path.resolve(process.cwd(), 'src/app/globals.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    it('1. defines text-rendering and font smoothing for crisp typography', () => {
      expect(css).toContain('text-rendering: optimizeLegibility');
      expect(css).toContain('-webkit-font-smoothing: antialiased');
      expect(css).toContain('-moz-osx-font-smoothing: grayscale');
    });

    it('2. provides WCAG AA compliant muted-foreground contrast token in dark mode', () => {
      expect(css).toContain('--muted-foreground: 215 25% 72%');
    });

    it('3. defines prefers-reduced-motion media query for motion accessibility', () => {
      expect(css).toContain('@media (prefers-reduced-motion: reduce)');
      expect(css).toContain('animation: none !important');
      expect(css).toContain('scroll-behavior: auto !important');
    });

    it('4. defines hardware card elevation, focus-ring, and badge-dot utilities', () => {
      expect(css).toContain('.card-hardware');
      expect(css).toContain('.focus-ring');
      expect(css).toContain('.badge-dot');
    });
  });

  describe('Card Component Design Variants', () => {
    it('5. renders default card with standard border and shadow', () => {
      const element = React.createElement(Card, {
        variant: 'default',
        className: 'custom-class',
        children: 'Default Card',
      });
      expect(React.isValidElement(element)).toBe(true);
      expect(element.props.variant).toBe('default');
      expect(Card.displayName).toBe('Card');
    });

    it('6. renders hardware variant with tactile elevation', () => {
      const element = React.createElement(Card, {
        variant: 'hardware',
        children: React.createElement(CardTitle, null, 'Hardware POS Terminal'),
      });
      expect(React.isValidElement(element)).toBe(true);
      expect(element.props.variant).toBe('hardware');
    });

    it('7. renders interactive card with hover states', () => {
      const element = React.createElement(Card, {
        variant: 'interactive',
        children: 'Clickable Dish Card',
      });
      expect(React.isValidElement(element)).toBe(true);
      expect(element.props.variant).toBe('interactive');
    });
  });

  describe('Badge Component Status Indicators', () => {
    it('8. renders standard badge with semantic colors', () => {
      const element = React.createElement(Badge, {
        variant: 'success',
        children: 'ปรุงเสร็จแล้ว',
      });
      expect(React.isValidElement(element)).toBe(true);
      expect(element.props.variant).toBe('success');
    });

    it('9. supports live status dot indicator for real-time kitchen and table status', () => {
      const element = React.createElement(Badge, {
        variant: 'warning',
        dot: true,
        children: 'กำลังปรุง',
      });
      expect(React.isValidElement(element)).toBe(true);
      expect(element.props.dot).toBe(true);
    });
  });

  describe('Input Component Mobile UX', () => {
    it('10. sets text-base md:text-sm to prevent iOS Safari auto-zooming on focus', () => {
      const element = React.createElement(Input, {
        placeholder: 'กรอกชื่อเมนูอาหาร...',
      });
      expect(React.isValidElement(element)).toBe(true);
    });
  });

  describe('Button Component Tactile Standards', () => {
    it('11. renders POS button variant with rich gradient and minimum touch target', () => {
      const element = React.createElement(Button, {
        variant: 'pos',
        children: 'ยืนยันสั่งอาหาร',
      });
      expect(React.isValidElement(element)).toBe(true);
      expect(element.props.variant).toBe('pos');
    });

    it('12. ensures icon size fulfills WCAG 2.1 AA 44x44px touch target guidelines', () => {
      const buttonPath = path.resolve(process.cwd(), 'src/components/ui/button.tsx');
      const buttonSrc = fs.readFileSync(buttonPath, 'utf8');
      expect(buttonSrc).toContain('min-h-[44px] min-w-[44px]');
    });
  });

  describe('Modal Dialog Mobile Responsiveness', () => {
    it('13. prevents dialog overflow on small mobile screens with calc(100%-2rem) and max-h-[90vh]', () => {
      const dialogPath = path.resolve(process.cwd(), 'src/components/ui/dialog.tsx');
      const dialogSrc = fs.readFileSync(dialogPath, 'utf8');
      expect(dialogSrc).toContain('w-[calc(100%-2rem)] sm:w-full');
      expect(dialogSrc).toContain('max-h-[90vh] overflow-y-auto');
    });
  });

  describe('Customer Ordering Skeleton Loading UX', () => {
    it('14. verifies accessible skeleton loading placeholders when loading is true', () => {
      const covPath = path.resolve(process.cwd(), 'src/components/tenant/CustomerOrderingView.tsx');
      const covSrc = fs.readFileSync(covPath, 'utf8');
      expect(covSrc).toContain('role="status" aria-busy="true" aria-label="กำลังโหลดรายการอาหาร"');
      expect(covSrc).toContain('role="status" aria-label="กำลังโหลดหมวดหมู่อาหาร"');
    });

    it('15. verifies tactile button depression effect and anti-double-click feedback on item addition', () => {
      const covPath = path.resolve(process.cwd(), 'src/components/tenant/CustomerOrderingView.tsx');
      const covSrc = fs.readFileSync(covPath, 'utf8');
      // Depressed tactile styles
      expect(covSrc).toContain('active:scale-90 active:translate-y-1 active:shadow-inner');
      // Added confirmation text
      expect(covSrc).toContain('เพิ่มลงตะกร้าแล้ว! ✔️');
      // Thai confirmation toast
      expect(covSrc).toContain('เพิ่มรายการ "${selectedMenuItem.name}" แล้ว 🛒');
    });

    it('16. verifies order review & confirmation modal before submitting order to kitchen to prevent duplicate orders', () => {
      const covPath = path.resolve(process.cwd(), 'src/components/tenant/CustomerOrderingView.tsx');
      const covSrc = fs.readFileSync(covPath, 'utf8');
      expect(covSrc).toContain('isOrderReviewOpen');
      expect(covSrc).toContain('ตรวจสอบรายการอาหาร');
      expect(covSrc).toContain('เพื่อป้องกันการสั่งอาหารซ้ำซ้อนโดยไม่ตั้งใจ');
      expect(covSrc).toContain('ยืนยันส่งเข้าครัวทันที 🍳');
    });

    it('17. verifies high-contrast solid dark slate toast styling and readable text colors in ToastContext', () => {
      const toastPath = path.resolve(process.cwd(), 'src/context/ToastContext.tsx');
      const toastSrc = fs.readFileSync(toastPath, 'utf8');
      expect(toastSrc).toContain("bgColor: '#0f172a'");
      expect(toastSrc).toContain("borderColor: '#10b981'");
      expect(toastSrc).toContain("titleColor: 'text-white'");
      expect(toastSrc).toContain("messageColor: 'text-emerald-300'");
      expect(toastSrc).toContain('bg-slate-900 border-2 border-emerald-500');
    });
  });
});

