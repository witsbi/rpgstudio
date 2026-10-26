import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "RPG Studio", description: "Create the world. Save it to the Marketplace. Choose your role." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
