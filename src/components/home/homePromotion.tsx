/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react'
import { useRouter, usePathname } from "next/navigation";
import { getBannerNavigationUrl } from "@/utils/bannerNavigation";

interface FeaturedProductItem {
  id: number;
  title?: string;
  description?: string;
  image: string;
  url?: string | null;
  banner_links?: Array<{
    id: number;
    linkable_type?: string | null;
    linkable_id?: number;
    banner_management_id?: number;
    type?: string;
  }>;
}

interface HomeFeaturedProductsProps {
  featuredProducts?: FeaturedProductItem[];
  title?: string;
  showTitle?: boolean;
}

function HomeFeaturedProducts({
  featuredProducts = [],
  title = "Featured Products",
  showTitle = true,
}: HomeFeaturedProductsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isProductCategoryPage = pathname?.includes("product-category") || pathname?.includes("/category") || pathname?.includes("/brand");

  // Don't render if no featured products
  if (!featuredProducts || featuredProducts.length === 0) {
    return null;
  }

  const handleProductClick = (product: FeaturedProductItem) => {
    const fallbackUrl = product.title
      ? `/product/product-category?type=featured_products&q=${encodeURIComponent(product.title)}`
      : undefined;
    router.push(getBannerNavigationUrl(product, { fallbackUrl }));
  };

  return (
    <>
      <section className="homePromotion_sc">
        <div className="container">
          {showTitle ? (
            <div className="s_head flex hd_4">
              <h2 className='fw_med'>{title}</h2>
            </div>
          ) : null}
          <ul className="promotion_grid gap_m">
            {featuredProducts.map((product) => (
              <li 
                key={product.id}
                onClick={() => handleProductClick(product)}
                style={{ cursor: "pointer" }}
              >
                <figure
                  style={{
                    borderRadius: isProductCategoryPage ? "14px" : "0px",
                    overflow: "hidden"
                  }}
                >
                  <img 
                    src={product.image} 
                    alt={product.title || product.description || "featured product"} 
                    style={{
                      borderRadius: isProductCategoryPage ? "14px" : "0px",
                      display: "block",
                      width: "100%"
                    }}
                  />
                </figure>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}

export default HomeFeaturedProducts