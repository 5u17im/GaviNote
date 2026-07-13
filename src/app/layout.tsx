import type { Metadata } from "next";
import "./globals.css";

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
      className="h-full antialiased"
    >
      <body className="min-h-full bg-[#0B0F19] text-[#F0F4FF] font-sans overflow-hidden select-none">
        {children}
      </body>
    </html>
  );
}
