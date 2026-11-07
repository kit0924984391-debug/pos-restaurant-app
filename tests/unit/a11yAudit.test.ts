import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('WCAG 2.2 Accessibility (a11y-audit) Verification Suite', () => {
  const rootDir = process.cwd();

  it('WCAG 1.4.4 (Resize text): Viewport must allow user pinch-to-zoom up to 500%', () => {
    const layoutPath = path.join(rootDir, 'src', 'app', 'layout.tsx');
    const layoutCode = fs.readFileSync(layoutPath, 'utf-8');

    // Must have userScalable set to true and maximumScale allowing zoom
    expect(layoutCode).toMatch(/userScalable:\s*true/);
    expect(layoutCode).toMatch(/maximumScale:\s*5/);
  });

  it('WCAG 3.1.1 (Language of Page): HTML tag must declare primary language as Thai ("th")', () => {
    const layoutPath = path.join(rootDir, 'src', 'app', 'layout.tsx');
    const layoutCode = fs.readFileSync(layoutPath, 'utf-8');

    expect(layoutCode).toMatch(/<html\s+lang=["']th["']/);
  });

  it('WCAG 2.4.1 (Bypass Blocks): Landing page must provide a skip-link to main content', () => {
    const pagePath = path.join(rootDir, 'src', 'app', 'page.tsx');
    const pageCode = fs.readFileSync(pagePath, 'utf-8');

    // Must have skip-link targeting main-content
    expect(pageCode).toMatch(/href="#main-content"/);
    expect(pageCode).toMatch(/id="main-content"/);
    // Must be hidden visually until focused (sr-only focus:not-sr-only)
    expect(pageCode).toMatch(/sr-only\s+focus:not-sr-only/);
  });

  it('WCAG 1.3.5 & 3.3.8 (Accessible Auth): Login form must have input purposes and autocomplete tokens', () => {
    const loginPath = path.join(rootDir, 'src', 'app', 'login', 'page.tsx');
    const loginCode = fs.readFileSync(loginPath, 'utf-8');

    // Phone / Username autocomplete
    expect(loginCode).toMatch(/autoComplete="tel username"/);
    // Password autocomplete
    expect(loginCode).toMatch(/autoComplete="current-password"/);
    // Explicit label association
    expect(loginCode).toMatch(/htmlFor="login-phone"/);
    expect(loginCode).toMatch(/id="login-phone"/);
    expect(loginCode).toMatch(/htmlFor="login-password"/);
    expect(loginCode).toMatch(/id="login-password"/);
    // Error message announcement
    expect(loginCode).toMatch(/role="alert"/);
  });

  it('WCAG 1.3.5 & 3.3.8 (Accessible Auth): Register form must have input purposes, autocomplete, and accessible labels', () => {
    const registerPath = path.join(rootDir, 'src', 'app', 'register', 'page.tsx');
    const registerCode = fs.readFileSync(registerPath, 'utf-8');

    // Autocomplete attributes
    expect(registerCode).toMatch(/autoComplete="name"/);
    expect(registerCode).toMatch(/autoComplete="email"/);
    expect(registerCode).toMatch(/autoComplete="tel"/);
    expect(registerCode).toMatch(/autoComplete="one-time-code"/);
    expect(registerCode).toMatch(/autoComplete="new-password"/);

    // Label associations
    expect(registerCode).toMatch(/htmlFor="register-store-name"/);
    expect(registerCode).toMatch(/id="register-store-name"/);
    expect(registerCode).toMatch(/htmlFor="register-owner-name"/);
    expect(registerCode).toMatch(/id="register-owner-name"/);
    expect(registerCode).toMatch(/htmlFor="register-email"/);
    expect(registerCode).toMatch(/id="register-email"/);
    expect(registerCode).toMatch(/htmlFor="register-bank-name"/);
    expect(registerCode).toMatch(/id="register-bank-name"/);
    expect(registerCode).toMatch(/htmlFor="register-bank-account-no"/);
    expect(registerCode).toMatch(/id="register-bank-account-no"/);
    expect(registerCode).toMatch(/htmlFor="register-bank-account-name"/);
    expect(registerCode).toMatch(/id="register-bank-account-name"/);
    expect(registerCode).toMatch(/htmlFor="register-phone"/);
    expect(registerCode).toMatch(/id="register-phone"/);
    expect(registerCode).toMatch(/htmlFor="register-otp"/);
    expect(registerCode).toMatch(/id="register-otp"/);
    expect(registerCode).toMatch(/htmlFor="register-password"/);
    expect(registerCode).toMatch(/id="register-password"/);
    expect(registerCode).toMatch(/htmlFor="register-confirm-password"/);
    expect(registerCode).toMatch(/id="register-confirm-password"/);

    // Error banner announcement
    expect(registerCode).toMatch(/role="alert"/);
  });
});
