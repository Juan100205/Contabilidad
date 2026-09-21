import type { Metadata } from "next";
import { Manrope, Inter } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/session";
import "./globals.css";

const display = Manrope({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Mis Finanzas — Panel de control",
  description: "Dashboard personal de ingresos, gastos, deudas y ahorros",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const dataTheme = session?.theme === "RosaPastel" ? "pastel" : undefined;

  return (
    <html lang="es" data-theme={dataTheme} className={`${display.variable} ${body.variable}`}>
      <body className="font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
