import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kuzushi Widget - Next.js Integration',
  description: 'Complete examples of integrating Kuzushi AI assistant into Next.js applications',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
