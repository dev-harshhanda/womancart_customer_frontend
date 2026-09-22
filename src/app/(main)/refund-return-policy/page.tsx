import type { Metadata } from "next";
import RefundReturnPolicyClient from "./RefundReturnPolicyClient";

export const metadata: Metadata = {
  title: "Return & Refund Policy | Womancart",
  description: "Read Womancart return and refund policy details.",
};

export default function RefundReturnPolicyPage() {
  return <RefundReturnPolicyClient />;
}
