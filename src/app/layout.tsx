import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Armazém Parada Obrigatória", template: "%s | Armazém Parada Obrigatória" },
  description: "Ofertas frescas, produtos selecionados e sua lista de compras em um só lugar.",
  icons: { icon: "/images/logo.png", apple: "/images/logo.png" },
  openGraph: { title: "Armazém Parada Obrigatória", description: "Tudo que a sua casa pede.", locale: "pt_BR", type: "website", images: ["/images/hero-market.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" className={manrope.variable}><body>{children}</body></html>;
}
