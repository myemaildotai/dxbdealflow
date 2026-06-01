import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { Inter, Montserrat } from "next/font/google";
import "react-phone-number-input/style.css";
import "./globals.css";
import { AuthProvider } from "@/auth/AuthProvider";
import { MaintenanceModeGuard } from "@/components/MaintenanceModeGuard";
import { ThemeProvider } from "@/theme/ThemeProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "DXB Deal Flow",
  description:
    "A property deal exchange MVP with public listing discovery, broker approvals, listing credits, enquiries, and realtime broker chat.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${montserrat.variable}`}>
        <ThemeProvider>
          <AuthProvider>
            <Suspense fallback={null}>
              <MaintenanceModeGuard />
            </Suspense>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
