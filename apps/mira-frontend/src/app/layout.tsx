import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import './globals.css';

const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Mira – Agentic AI System for Company Research',
  description:
    'Mira is an open-source AI agent system that automates company research, combining website crawling, LinkedIn insights, Google search, and analysis into one workflow.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body className={`${montserrat.variable} antialiased`}>{children}</body>
    </html>
  );
}
