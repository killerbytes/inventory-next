import { AppProvider } from "@/components/providers/AppProvider";
import { UserData } from "@/schemas";
import { getSession } from "@/server/auth/session";
import type { Metadata } from "next";
import { IBM_Plex_Mono, Lora, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const sansFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const serifFont = Lora({
  subsets: ["latin"],
  variable: "--font-serif",
});

const monoFont = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Inventory Management System",
  description: "Modern Inventory Management System built with Next.js",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessionUser = await getSession();

  return (
    <html lang="en" className="h-full">
      <body
        className={`${sansFont.variable} ${serifFont.variable} ${monoFont.variable} font-sans antialiased h-full bg-[#f3f4f9] dark:bg-background text-foreground`}
      >
        <AppProvider user={sessionUser as UserData}>{children}</AppProvider>
      </body>
    </html>
  );
}
