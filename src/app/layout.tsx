import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TaxWise Uganda — AI-Powered Tax SaaS Platform",
  description: "A professional, AI-powered tax platform for consultants, accountants, lawyers, and business owners in Uganda. Features TAT ruling analyzer, learning hub, and eFRIS compliance checks.",
  keywords: ["TaxWise", "Uganda", "Tax Appeals Tribunal", "URA", "eFRIS", "VAT", "PAYE", "Tax Calculator"],
  openGraph: {
    title: "TaxWise Uganda — AI-Powered Tax SaaS Platform",
    description: "AI-powered analysis of Tax Appeals Tribunal (TAT) rulings, compliance checking tools for eFRIS, VAT, and PAYE, and structured tax education.",
    type: "website",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}

