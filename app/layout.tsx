import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Studie Mentor",
  description: "Persoonlijke studie mentor voor HAVO 1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
