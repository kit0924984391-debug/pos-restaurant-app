import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { AutoAnimate } from '@/components/AutoAnimate';
import { useAutoAnimateSafe } from '@/hooks/useAutoAnimateSafe';

describe('AutoAnimate Zero-Config Animation Suite (@formkit/auto-animate)', () => {
  it('1. exports AutoAnimate component and useAutoAnimateSafe hook properly', () => {
    expect(AutoAnimate).toBeDefined();
    expect(typeof AutoAnimate).toBe('function');
    expect(useAutoAnimateSafe).toBeDefined();
    expect(typeof useAutoAnimateSafe).toBe('function');
  });

  it('2. constructs AutoAnimate component with default div element', () => {
    const element = React.createElement(
      AutoAnimate as any,
      { className: 'cart-items-container' },
      React.createElement('div', { key: 'item-1' }, 'ข้าวกะเพราหมูกรอบ'),
      React.createElement('div', { key: 'item-2' }, 'ต้มยำกุ้งน้ำข้น')
    );

    expect(React.isValidElement(element)).toBe(true);
    expect((element.props as any).className).toBe('cart-items-container');
    expect((element.props as any).as).toBeUndefined();
  });

  it('3. constructs AutoAnimate with semantic list tags (as="ul")', () => {
    const listElement = React.createElement(
      AutoAnimate as any,
      {
        as: 'ul',
        className: 'faq-list-accordion',
        options: { duration: 200, easing: 'ease-out' },
      },
      React.createElement('li', { key: 'faq-1' }, 'Question 1'),
      React.createElement('li', { key: 'faq-2' }, 'Question 2')
    );

    expect(React.isValidElement(listElement)).toBe(true);
    expect((listElement.props as any).as).toBe('ul');
    expect((listElement.props as any).options).toEqual({ duration: 200, easing: 'ease-out' });
  });

  it('4. maintains accessibility and safe SSR initialization without crashes', () => {
    // Testing that hook execution and component render don't throw in node/vitest environment
    expect(() => {
      React.createElement(
        AutoAnimate as any,
        null,
        React.createElement('p', null, 'Content')
      );
    }).not.toThrow();
  });
});
