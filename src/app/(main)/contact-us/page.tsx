import type { Metadata } from "next";
import ContactUsClient from "./ContactUsClient";

export const metadata: Metadata = {
  title: "Contact Us | Womancart",
  description: "Get in touch with the Womancart support team.",
};

export default function ContactUsPage() {
  return <ContactUsClient />;
}
