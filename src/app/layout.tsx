import type { Metadata } from "next";
import "./globals.css";
import Footer from "@/components/Footer";
import { AlertProvider } from "@/contexts/AlertContext";

export const metadata: Metadata = {
  title: "AdOrder",
  description: "광고 주문 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <AlertProvider>
          {children}
          <Footer />
        </AlertProvider>
      </body>
    </html>
  );
}
