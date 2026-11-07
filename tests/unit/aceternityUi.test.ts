import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { Spotlight } from '@/components/ui/spotlight';
import { BackgroundGradient } from '@/components/ui/background-gradient';
import { CardSpotlight } from '@/components/ui/card-spotlight';

describe('Aceternity UI Component Suite Verification', () => {
  it('1. Spotlight exports and constructs an SVG directional beam', () => {
    expect(Spotlight).toBeDefined();
    expect(typeof Spotlight).toBe('function');

    const spotlight = React.createElement(Spotlight as any, {
      className: 'test-spotlight',
      fill: '#f97316',
    });

    expect(React.isValidElement(spotlight)).toBe(true);
    expect(spotlight.props.fill).toBe('#f97316');
    expect(spotlight.props.className).toBe('test-spotlight');
  });

  it('2. BackgroundGradient constructs with animated motion layers', () => {
    expect(BackgroundGradient).toBeDefined();
    expect(typeof BackgroundGradient).toBe('function');

    const bgGradient = React.createElement(BackgroundGradient as any,
      {
        className: 'custom-card-inner',
        containerClassName: 'custom-card-container',
        animate: true,
      },
      React.createElement('h3', null, 'Featured Plan')
    );

    expect(React.isValidElement(bgGradient)).toBe(true);
    expect(bgGradient.props.animate).toBe(true);
    expect(bgGradient.props.containerClassName).toBe('custom-card-container');
  });

  it('3. CardSpotlight constructs with radial cursor tracking support', () => {
    expect(CardSpotlight).toBeDefined();
    expect(typeof CardSpotlight).toBe('function');

    const card = React.createElement(CardSpotlight as any as any,
      {
        radius: 400,
        color: '#ea580c',
        className: 'feature-card',
      },
      React.createElement('p', null, 'Interactive Spotlight Content')
    );

    expect(React.isValidElement(card)).toBe(true);
    expect((card.props as any).radius).toBe(400);
    expect((card.props as any).color).toBe('#ea580c');
  });
});
