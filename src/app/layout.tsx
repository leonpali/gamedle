import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gamedle",
  description: "Guess the video game of the day.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
