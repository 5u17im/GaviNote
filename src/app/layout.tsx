import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-dm-serif",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GraviNote — Sistema de Ideación en Gravedad Cero",
  description: "Tus ideas en gravedad cero. Un lienzo de notas interactivo con física 2D, magnetismo por etiquetas y conexiones elásticas. Creado por Nothing Sense.",
  keywords: ["notas", "mapas mentales", "física 2d", "matter-js", "creatividad", "nothing sense", "gravinote"],
};

// Disable native browser pinch-zoom so gestures drive the in-app canvas zoom only.
// Without this, a trackpad/touch pinch scales the whole page (HUD included).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`h-full antialiased ${inter.variable} ${dmSerif.variable} ${jetBrainsMono.variable}`}
    >
      <body className="min-h-full bg-[#0B0F19] text-[#F0F4FF] font-sans overflow-hidden select-none">
        {children}
      </body>
    </html>
  );
}
