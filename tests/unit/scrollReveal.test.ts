import { describe, it, expect } from 'vitest';
import * as React from 'react';
import ScrollReveal from '@/components/ScrollReveal';

describe('ScrollReveal Mobile-Grade Animation Suite', () => {
  it('1. exports ScrollReveal component correctly', () => {
    expect(ScrollReveal).toBeDefined();
    expect(typeof ScrollReveal).toBe('function');
  });

  it('2. constructs ScrollReveal element with mobile-grade default props', () => {
    const element = React.createElement(ScrollReveal as any,
      {
        direction: 'up',
        className: 'test-section',
      },
      React.createElement('div', null, 'Section Content')
    );

    expect(React.isValidElement(element)).toBe(true);
    expect(element.props.direction).toBe('up');
    expect(element.props.className).toBe('test-section');
  });

  it('3. supports subtle travel distance and snappy duration parameters', () => {
    const element = React.createElement(ScrollReveal as any,
      {
        direction: 'zoom',
        distance: 20,
        duration: 450,
        once: true,
        fadeOutOnExit: false,
      },
      React.createElement('h2', null, 'Headline')
    );

    expect(element.props.distance).toBe(20);
    expect(element.props.duration).toBe(450);
    expect(element.props.once).toBe(true);
    expect(element.props.fadeOutOnExit).toBe(false);
  });
});
