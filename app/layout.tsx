import type { Metadata } from "next";
import "./globals.css";
import {Chrome} from './site-ui';

export const metadata: Metadata = {
  title: {default:"Cobalt Syndicate — Clarity before your next move",template:"%s | Cobalt Syndicate"},
  description: "Explore prop-firm programs, compare their rules and discover creator partnerships with Cobalt Syndicate. By ZaberFX.",
  icons: {
    icon: "/cobalt-logo.png",
    shortcut: "/cobalt-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased"><Chrome>{children}</Chrome></body>
    </html>
  );
}
