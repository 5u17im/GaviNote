import type { Metadata } from "next";
import { DM_Serif_Display, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "GraviNote — Sistema de Ideación en Gravedad Cero",
  description: "Tus ideas en gravedad cero. Un lienzo de notas interactivo con física 2D, magnetismo por etiquetas y conexiones elásticas. Creado por Nothing Sense.",
  keywords: ["notas", "mapas mentales", "física 2d", "matter-js", "creatividad", "nothing sense", "gravinote"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${dmSerifDisplay.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#0B0F19] text-[#F0F4FF] font-sans overflow-hidden select-none">
        {children}
      </body>
    </html>
  );
}
