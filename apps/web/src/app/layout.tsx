import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Easy Trip Nepal — Platform',
  description: 'Nepal-first travel marketplace. Phase 05 project initialization.',
};

/**
 * Root layout.
 *
 * Phase 05 ships the shell only: the public storefront, customer area, vendor
 * portal and admin console route groups arrive in their own phases (Arch §22).
 * Fonts stay on the system stack for now so builds never depend on network access.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
