import type { Metadata } from "next";
import { Fraunces, DM_Sans, JetBrains_Mono, Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const fraunces = Fraunces({ 
  subsets: ["latin"], 
  variable: "--font-fraunces",
  axes: ["opsz"]
});

const dmSans = DM_Sans({ 
  subsets: ["latin"],
  variable: "--font-dm-sans"
});

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: "--font-jetbrains-mono"
});

export const metadata: Metadata = {
  title: "JobReco - Hệ thống Đánh giá Mức độ phù hợp Công việc",
  description: "Find jobs that fit your actual skills using HGAT and SLWG analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", dmSans.variable)}>
      <body suppressHydrationWarning className={`${fraunces.variable} ${dmSans.variable} ${jetbrainsMono.variable} font-sans bg-base text-primary antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
