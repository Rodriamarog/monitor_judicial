import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Monitor Judicial PJBC - Alertas Automáticas de Boletines Judiciales",
    template: "%s | Monitor Judicial PJBC",
  },
  description:
    "Monitorea tus casos del Poder Judicial de Baja California automáticamente. Recibe alertas por WhatsApp y email cuando tus expedientes aparezcan en los boletines judiciales de Tijuana, Mexicali, Ensenada y Tecate.",
  keywords: [
    "boletines judiciales",
    "PJBC",
    "Poder Judicial Baja California",
    "alertas judiciales",
    "monitor casos",
    "expedientes Tijuana",
    "juzgados Baja California",
    "notificaciones judiciales",
    "WhatsApp alertas",
  ],
  authors: [{ name: "Monitor Judicial PJBC" }],
  creator: "Monitor Judicial PJBC",
  publisher: "Monitor Judicial PJBC",
  metadataBase: new URL("https://monitorjudicial.com.mx"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Monitor Judicial PJBC - Alertas Automáticas de Boletines Judiciales",
    description:
      "Monitorea tus casos del Poder Judicial de Baja California automáticamente. Recibe alertas por WhatsApp y email.",
    url: "https://monitorjudicial.com.mx",
    siteName: "Monitor Judicial PJBC",
    locale: "es_MX",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Monitor Judicial PJBC - Sistema de Alertas Judiciales",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Monitor Judicial PJBC - Alertas Automáticas",
    description:
      "Monitorea tus casos del PJBC automáticamente. Alertas por WhatsApp y email.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Add your verification codes when available
    // google: 'your-google-site-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#f59e0b" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
