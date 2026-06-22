import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rox — Dynamic Ads",
  description: "Place dynamic ad markers on a podcast episode timeline.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
