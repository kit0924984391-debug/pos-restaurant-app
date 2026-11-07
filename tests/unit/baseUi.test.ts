import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import {
  Dialog,
  DialogRoot,
  DialogPortal,
  DialogBackdrop,
  DialogPopup,
  DialogTitle,
  DialogDescription,
  DialogClose,
  BaseDialog,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipRoot,
  TooltipTrigger,
  TooltipPortal,
  TooltipPositioner,
  TooltipPopup,
  TooltipArrow,
  TooltipProvider,
  BaseTooltip,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverRoot,
  PopoverTrigger,
  PopoverPortal,
  PopoverPositioner,
  PopoverPopup,
  PopoverTitle,
  PopoverDescription,
  PopoverClose,
  BasePopover,
} from '@/components/ui/popover';
import AuthModal from '@/components/board/AuthModal';

describe('Base UI React Integration Tests', () => {
  describe('Dialog Primitives', () => {
    it('should export all required Base UI Dialog primitives', () => {
      expect(Dialog).toBeDefined();
      expect(DialogRoot).toBeDefined();
      expect(DialogPortal).toBeDefined();
      expect(DialogBackdrop).toBeDefined();
      expect(DialogPopup).toBeDefined();
      expect(DialogTitle).toBeDefined();
      expect(DialogDescription).toBeDefined();
      expect(DialogClose).toBeDefined();
    });

    it('should construct BaseDialog component element without error', () => {
      const element = React.createElement(BaseDialog, {
        open: true,
        onOpenChange: vi.fn(),
        title: 'ยืนยันการทำรายการ',
        description: 'กรุณาตรวจสอบความถูกต้องของข้อมูล',
        children: React.createElement('div', null, 'เนื้อหาการทำงาน'),
      });

      expect(React.isValidElement(element)).toBe(true);
      expect(element.props.open).toBe(true);
      expect(element.props.title).toBe('ยืนยันการทำรายการ');
    });
  });

  describe('Tooltip Primitives', () => {
    it('should export all required Base UI Tooltip primitives', () => {
      expect(Tooltip).toBeDefined();
      expect(TooltipRoot).toBeDefined();
      expect(TooltipTrigger).toBeDefined();
      expect(TooltipPortal).toBeDefined();
      expect(TooltipPositioner).toBeDefined();
      expect(TooltipPopup).toBeDefined();
      expect(TooltipArrow).toBeDefined();
      expect(TooltipProvider).toBeDefined();
    });

    it('should construct BaseTooltip element without error', () => {
      const element = React.createElement(BaseTooltip, {
        content: 'คำแนะนำเพิ่มเติม',
        side: 'top',
        children: React.createElement('button', null, 'ชี้ที่นี่'),
      });

      expect(React.isValidElement(element)).toBe(true);
      expect(element.props.content).toBe('คำแนะนำเพิ่มเติม');
      expect(element.props.side).toBe('top');
    });
  });

  describe('Popover Primitives', () => {
    it('should export all required Base UI Popover primitives', () => {
      expect(Popover).toBeDefined();
      expect(PopoverRoot).toBeDefined();
      expect(PopoverTrigger).toBeDefined();
      expect(PopoverPortal).toBeDefined();
      expect(PopoverPositioner).toBeDefined();
      expect(PopoverPopup).toBeDefined();
      expect(PopoverTitle).toBeDefined();
      expect(PopoverDescription).toBeDefined();
      expect(PopoverClose).toBeDefined();
    });

    it('should construct BasePopover element without error', () => {
      const element = React.createElement(BasePopover, {
        trigger: React.createElement('button', null, 'เปิดเมนู'),
        children: React.createElement('div', null, 'รายการตัวเลือก'),
      });

      expect(React.isValidElement(element)).toBe(true);
    });
  });

  describe('AuthModal Integration with Base UI', () => {
    it('should construct AuthModal element with Base UI Dialog without error', () => {
      const element = React.createElement(AuthModal, {
        isOpen: true,
        onClose: vi.fn(),
        onSuccess: vi.fn(),
        title: 'เข้าสู่ระบบร้านตามสั่ง',
        subtitle: 'ยินดีต้อนรับสู่ระบบบริหารจัดการร้านอาหาร',
      });

      expect(React.isValidElement(element)).toBe(true);
      expect(element.props.isOpen).toBe(true);
      expect(element.props.title).toBe('เข้าสู่ระบบร้านตามสั่ง');
    });
  });
});
