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
      <head>
        {/* Manrope — the design's typeface (loaded via link so the build needs
            no font fetch; the browser pulls it at runtime) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
