import type { Metadata } from "next";
import AboutUsClient from "./AboutUsClient";

export const metadata: Metadata = {
  title: "About Us | Womancart",
  description: "Learn more about Womancart and our mission.",
};

export default function AboutUsPage() {
  return <AboutUsClient />;
}
