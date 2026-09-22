import type { Metadata } from "next";
import TermsConditionsClient from "./TermsConditionsClient";

export const metadata: Metadata = {
  title: "Terms & Conditions | Womancart",
  description: "Read the terms and conditions for shopping on Womancart.",
};

export default function TermsConditionsPage() {
  return <TermsConditionsClient />;
}
