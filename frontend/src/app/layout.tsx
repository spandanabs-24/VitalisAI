import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VITALIS AI — Futuristic Healthcare Operating System",
  description: "Billion-dollar AI healthcare intelligence platform. Immersive diagnostics, neural triage, and cinematic health monitoring.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
