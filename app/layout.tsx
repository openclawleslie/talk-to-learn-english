import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Talk To Learn English",
  description: "Weekly spoken homework system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
