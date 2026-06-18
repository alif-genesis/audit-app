import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aplikasi Audit - PT Genetika Solusi Bisnis",
  description: "Platform pengelolaan audit ISO, COBIT, dan audit tata kelola.",
  icons: {
    icon: "https://genetikasolusibisnis.co.id/wp-content/uploads/2022/09/genetika-1-warna.png",
    shortcut:
      "https://genetikasolusibisnis.co.id/wp-content/uploads/2022/09/genetika-1-warna.png",
    apple:
      "https://genetikasolusibisnis.co.id/wp-content/uploads/2022/09/genetika-1-warna.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
