import type { Metadata } from "next";
import ProductCategoryPage from "../product/product-category/page";

// Internal search results are not intended to rank — noindex, not canonicalized
// to something else (see WomanCart_Noindex_Canonical_Plan.md edge case 6).
export async function generateMetadata(): Promise<Metadata> {
  return { robots: "noindex, nofollow" };
}

export default ProductCategoryPage;
