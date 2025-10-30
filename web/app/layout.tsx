// web/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";            // <-- add this
import { AuthProvider } from "@/lib/firebase/AuthContext"; // <-- if you use it
import { ReactNode } from "react";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Orbit AI",
  description: "AI Test Case Generator",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <AuthProvider>
          <Navbar />           {/* <-- mount it once here */}
          {children}
        </AuthProvider>

        {/* expose API base (or use NEXT_PUBLIC_API_BASE) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.API_BASE="${"https://orbit-api-938180057345.us-central1.run.app"}";`,
          }}
        />
      </body>
    </html>
  );
}
