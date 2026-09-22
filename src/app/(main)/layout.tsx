"use client";
import Header from "@/components/header/Header";
import Footer from "@/components/footer/Footer";
import ThemeFromStorage from "@/components/ThemeFromStorage";
import DeliverySessionInit from "@/components/DeliverySessionInit";
import CommerceModeSync from "@/components/CommerceModeSync";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {

  return (
    <>
      <DeliverySessionInit />
      <ThemeFromStorage />
      <CommerceModeSync />
      <Header />
      <main className="content">{children}</main>
      <Footer />
    </>
  );
}
