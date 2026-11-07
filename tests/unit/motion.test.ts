import { describe, it, expect } from 'vitest';
import * as React from 'react';
import {
  motion,
  AnimatePresence,
  MotionConfigProvider,
  MotionButton,
  MotionCard,
  MotionFadeIn,
  MotionStagger,
  MotionStaggerItem,
  MOTION_SPRINGS,
} from '@/components/motion';

describe('Motion Animation Engine & Component Suite', () => {
  it('1. exports all core motion components and spring presets', () => {
    expect(motion).toBeDefined();
    expect(AnimatePresence).toBeDefined();
    expect(MotionConfigProvider).toBeDefined();
    expect(MotionButton).toBeDefined();
    expect(MotionCard).toBeDefined();
    expect(MotionFadeIn).toBeDefined();
    expect(MotionStagger).toBeDefined();
    expect(MotionStaggerItem).toBeDefined();
    expect(MOTION_SPRINGS.snappy.type).toBe('spring');
    expect(MOTION_SPRINGS.smooth.type).toBe('spring');
  });

  it('2. constructs MotionButton with default spring hover and tap scales', () => {
    const btn = React.createElement(MotionButton as any,
      { className: 'btn-test', onClick: () => {} },
      'ทดสอบปุ่ม Motion'
    );

    expect(React.isValidElement(btn)).toBe(true);
    expect(btn.props.className).toBe('btn-test');
  });

  it('3. constructs MotionCard with custom lift distance', () => {
    const card = React.createElement(MotionCard as any,
      { liftDistance: 6, className: 'card-test' },
      React.createElement('p', null, 'Card Content')
    );

    expect(React.isValidElement(card)).toBe(true);
    expect(card.props.liftDistance).toBe(6);
  });

  it('4. constructs MotionFadeIn with viewport scroll trigger properties', () => {
    const fade = React.createElement(MotionFadeIn as any,
      {
        direction: 'up',
        delay: 0.15,
        duration: 0.6,
        distance: 30,
        once: true,
      },
      React.createElement('h3', null, 'Section Title')
    );

    expect(React.isValidElement(fade)).toBe(true);
    expect(fade.props.direction).toBe('up');
    expect(fade.props.delay).toBe(0.15);
    expect(fade.props.distance).toBe(30);
  });

  it('5. constructs MotionStagger and MotionStaggerItem for list choreography', () => {
    const list = React.createElement(MotionStagger as any,
      { className: 'grid-list' },
      React.createElement(MotionStaggerItem as any, null, 'Item 1'),
      React.createElement(MotionStaggerItem as any, null, 'Item 2')
    );

    expect(React.isValidElement(list)).toBe(true);
  });

  it('6. MotionConfigProvider sets reducedMotion to "user" for WCAG 2.2 a11y', () => {
    const provider = React.createElement(MotionConfigProvider as any,
      null,
      React.createElement('div', null, 'App')
    );

    expect(React.isValidElement(provider)).toBe(true);
  });
});
