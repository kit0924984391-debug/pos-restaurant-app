import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';
import fs from 'fs';
import path from 'path';

describe('Tailwind & shadcn/ui Design Tokens & Utilities Suite', () => {
  it('1. components.json is properly configured for shadcn/ui', () => {
    const configPath = path.resolve(process.cwd(), 'components.json');
    expect(fs.existsSync(configPath)).toBe(true);

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    expect(config.style).toBe('default');
    expect(config.tailwind.cssVariables).toBe(true);
    expect(config.aliases.components).toBe('@/components');
    expect(config.aliases.ui).toBe('@/components/ui');
    expect(config.aliases.utils).toBe('@/lib/utils');
  });

  it('2. cn() merges classes and resolves conflicting tailwind utilities', () => {
    // Basic concatenation
    expect(cn('font-bold', 'text-white')).toBe('font-bold text-white');

    // Conflict resolution via tailwind-merge
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    expect(cn('bg-red-500', 'bg-primary')).toBe('bg-primary');

    // Conditionals
    const isError = false;
    const isSuccess = true;
    expect(cn('base-class', isError && 'text-destructive', isSuccess && 'text-success')).toBe(
      'base-class text-success'
    );
  });

  it('3. globals.css defines HSL semantic color tokens', () => {
    const cssPath = path.resolve(process.cwd(), 'src/app/globals.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    expect(css).toContain('--primary:');
    expect(css).toContain('--destructive:');
    expect(css).toContain('--success:');
    expect(css).toContain('--warning:');
    expect(css).toContain('--info:');
    expect(css).toContain('--border:');
    expect(css).toContain('.dark');
  });
});
