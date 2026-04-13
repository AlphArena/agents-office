import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agents Office — Hire AI engineering agents",
  description: "A virtual office of AI agents that write code, deploy infrastructure, design UIs, and audit smart contracts. Tell the orchestrator what you need, agents get to work.",
  openGraph: {
    title: "Agents Office",
    description: "AI engineering agents that actually build. Tell Atlas what you need.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[#0c0c14] text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
