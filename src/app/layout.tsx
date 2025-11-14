import type { Metadata } from "next";
import "./globals.css";
import "@/styles/toast.css";
import Footer from "@/components/Footer";
import { AlertProvider } from "@/contexts/AlertContext";
import { ToastProvider } from "@/contexts/ToastContext";

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
          <ToastProvider>
            {children}
            <Footer />
          </ToastProvider>
        </AlertProvider>
      </body>
    </html>
  );
}
