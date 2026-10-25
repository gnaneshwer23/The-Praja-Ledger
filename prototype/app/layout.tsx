import type { Metadata } from "next";
import { Noto_Serif_Telugu, Petrona } from "next/font/google";
import { BookFrame } from "@/components/book-frame";
import "./globals.css";

const petrona = Petrona({
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  variable: "--font-petrona",
});

const telugu = Noto_Serif_Telugu({
  subsets: ["telugu", "latin"],
  weight: "600",
  display: "swap",
  variable: "--font-telugu",
});

export const metadata: Metadata = {
  title: {
    default: "Praja Ledger",
    template: "%s · Praja Ledger",
  },
  description:
    "A public register of Telangana leaders. Offices, elections, promises, finances, and court proceedings, each line tied to a document.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${petrona.variable} ${telugu.variable}`}>
      <body>
        <BookFrame>{children}</BookFrame>
      </body>
    </html>
  );
}
