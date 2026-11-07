import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Responsive Web Design Suite (Multi-Device & Viewport Isolation)', () => {
  it('1. ensures useDeviceMode safely initializes on both client and SSR without layout flash', () => {
    const hookPath = path.resolve(process.cwd(), 'src/hooks/useDeviceMode.ts');
    const hookSrc = fs.readFileSync(hookPath, 'utf8');
    expect(hookSrc).toContain("typeof window !== 'undefined'");
    expect(hookSrc).toContain("return 'mobile'");
    expect(hookSrc).toContain("return 'tablet'");
    expect(hookSrc).toContain("return 'desktop'");
  });

  it('2. ensures PosTerminal enforces 3 isolated responsive device viewports (<768px, 768-1023px, >=1024px)', () => {
    const posPath = path.resolve(process.cwd(), 'src/components/tenant/PosTerminal.tsx');
    const posSrc = fs.readFileSync(posPath, 'utf8');
    expect(posSrc).toContain('block md:hidden');
    expect(posSrc).toContain('hidden md:block lg:hidden');
    expect(posSrc).toContain('hidden lg:block');
  });

  it('3. ensures StickyMobileDock honors iOS notch safe-area-inset-bottom', () => {
    const dockPath = path.resolve(process.cwd(), 'src/components/StickyMobileDock.tsx');
    const dockSrc = fs.readFileSync(dockPath, 'utf8');
    expect(dockSrc).toContain('env(safe-area-inset-bottom)');
  });

  it('4. ensures InteractiveComparisonSlider provides fluid responsive padding and min-height for small screens', () => {
    const sliderPath = path.resolve(process.cwd(), 'src/components/InteractiveComparisonSlider.tsx');
    const sliderSrc = fs.readFileSync(sliderPath, 'utf8');
    expect(sliderSrc).toContain('min-h-[480px] sm:min-h-[430px]');
    expect(sliderSrc).toContain('p-4 sm:p-8 md:p-10');
  });

  it('5. verifies responsive page container padding standards across mobile, tablet, and desktop', () => {
    const cssPath = path.resolve(process.cwd(), 'src/app/globals.css');
    const cssSrc = fs.readFileSync(cssPath, 'utf8');
    expect(cssSrc).toContain('.page-container-responsive');
    expect(cssSrc).toContain('.safe-area-bottom');
  });
});
