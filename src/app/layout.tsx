import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/app/components/header";
import Loading from "./loading";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lab Framework",
  description: "Lab Framework site",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Header />
        <Suspense fallback={<Loading />}>{children}</Suspense>
      </body>
    </html>
  );
}
