/* eslint-disable @next/next/no-img-element */
"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLazyGetBlogBySlugQuery, useGetBlogsListMutation } from "@/service/blog";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { OutlinedInput, InputAdornment, Button } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ProductCard from "@/components/productCard";
import { Product } from "@/types/General";

dayjs.extend(relativeTime);

type BlogProduct = {
  id?: number;
  product_id: number;
  name?: string;
  product_name: string;
  slug: string;
  short_description?: string;
  price?: {
    store_price: number | string;
    mrp: number | string;
    percentage_off: number;
  };
  image?: string;
  brand?: { id: number; name: string };
  category?: { id: number; name: string };
  average_rating?: string | number;
  review_count?: number;
};

interface Blog {
  id: number;
  slug: string;
  title: string;
  description?: string;
  content?: string;
  image?: string;
  featured_image?: string;
  thumbnail?: string;
  likes?: number;
  comments?: number;
  created_at?: string;
  updated_at?: string;
  posted_by?: string;
  posted_by_name?: string;
  author?: string;
  created_by?: string;
  category?: {
    id: number;
    name: string;
  };
  products?: BlogProduct[];
}

function mapBlogProductToCard(product: BlogProduct): Product {
  return {
    product_id: product.product_id ?? product.id ?? 0,
    variation_id: null,
    product_name: product.product_name || product.name || "",
    slug: product.slug,
    short_description: product.short_description || "",
    featured: false,
    is_new: false,
    best_seller: false,
    average_rating: product.average_rating?.toString() ?? null,
    review_count: product.review_count ?? 0,
    qty_available: 1,
    delivery_time: null,
    easy_return: null,
    delivery_policy: null,
    delivery_return: null,
    price: {
      store_price: String(product.price?.store_price ?? ""),
      mrp: String(product.price?.mrp ?? ""),
      percentage_off: product.price?.percentage_off ?? 0,
    },
    brand: product.brand ?? { id: 0, name: "" },
    category: product.category ?? { id: 0, name: "" },
    image: product.image || "/images/product_default.png",
    is_wishlist: false,
    barcode_image_url: null,
    size_chart: null,
  };
}

function BlogDetail() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();

  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [recentBlogs, setRecentBlogs] = useState<Blog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const [getBlogBySlug, { isLoading: slugLoading }] = useLazyGetBlogBySlugQuery();
  const [getBlogsList] = useGetBlogsListMutation();

  useEffect(() => {
    if (!slug) return;
    void fetchBlogDetails(slug);
    void fetchRecentBlogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const fetchRecentBlogs = async () => {
    try {
      const response: any = await getBlogsList({ page: 1, limit: 5 }).unwrap();
      const blogsData =
        response?.data?.data ||
        response?.data ||
        (Array.isArray(response) ? response : []);
      if (Array.isArray(blogsData)) {
        setRecentBlogs(blogsData);
      }
    } catch (error) {
      // console.error("Error fetching recent blogs:", error);
    }
  };

  const fetchBlogDetails = async (slug: string) => {
    try {
      setDetailLoading(true);
      const response: any = await getBlogBySlug({ slug }).unwrap();
      const blogData = response?.data || response;
      if (blogData) {
        setSelectedBlog(blogData);
      }
    } catch (error) {
      console.error("Error fetching blog details:", error);
    } finally {
      setDetailLoading(false);
    }
  };

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return "Recently";
    try {
      return dayjs(dateString).fromNow();
    } catch {
      return "Recently";
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      return dayjs(dateString).format("dddd, MMM D | h:mm A");
    } catch {
      return "";
    }
  };

  const stripHtmlTags = (html?: string) => {
    if (!html) return "";
    const text = html.replace(/<[^>]*>/g, "");
    if (typeof document !== "undefined") {
      const textarea = document.createElement("textarea");
      textarea.innerHTML = text;
      return textarea.value;
    }
    return text;
  };

  const handleRecentBlogClick = (b: Blog) => {
    const identifier = b.slug || b.id;
    if (identifier) router.push(`/blogs/${identifier}`);
  };

  return (
    <>
      <div className="container u_spc">
        {/* <div className="s_head flex hd_6">
          <button
            onClick={() => router.push("/blogs")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "inherit",
              font: "inherit",
              marginBottom: "20px"
            }}
          >
            ← Back to Blogs
          </button>
        </div> */}

        <div className="blog_wrpr blog_detail_layout">
          <div className="blg_lft">
            <div className="blog_search_wrapper">
              <OutlinedInput
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search"
                className="blog_search_input"
                startAdornment={
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                }
              />
            </div>

            <div className="recent_blogs_sidebar">
              <div className="recent_blogs_header">
                <h3>Recent Blogs</h3>
              </div>
              <ul>
                {recentBlogs.map((blog, index) => (
                  <li
                    key={blog.id || index}
                    className="blg_lst sidebar_blog_item"
                    onClick={() => handleRecentBlogClick(blog)}
                  >
                    <div className="article-card">
                      <figure className="card-image">
                        <img
                          src={blog.image || blog.featured_image || blog.thumbnail || "/images/blog1.png"}
                          alt={blog.title || "Blog"}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/images/blog1.png";
                          }}
                        />
                      </figure>

                      <div className="card-content">
                        <div className="time-badge">
                          {formatTimeAgo(blog.created_at || blog.updated_at)}
                        </div>
                        <h3>{blog.title || "Untitled"}</h3>
                        <p>
                          {stripHtmlTags(blog.description) ||
                            "No description available for this blog post."}
                        </p>
                        <Button size="small" className="btn_primary more_btn">
                          Read More
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="blg_rgt">
            {detailLoading || slugLoading ? (
              <>
                <p className="blog_detail_loading_text">Loading blog details...</p>
                <div className="article-card blog_detail_skeleton">
                  <div className="card-header" style={{ position: "relative" }}>
                    <figure>
                      <div className="skeleton_shimmer blog_detail_skeleton_image" />
                    </figure>
                    <div className="skeleton_shimmer blog_detail_skeleton_badge" />
                  </div>
                  <div className="card-body">
                    <div className="card-icons">
                      <div className="skeleton_shimmer blog_detail_skeleton_icon" />
                      <div className="skeleton_shimmer blog_detail_skeleton_icon" />
                      <div className="skeleton_shimmer blog_detail_skeleton_icon" />
                    </div>
                    <div className="post-info">
                      <div className="skeleton_shimmer blog_detail_skeleton_info" />
                      <div className="skeleton_shimmer blog_detail_skeleton_info_short" />
                    </div>
                    <div className="skeleton_shimmer blog_detail_skeleton_title" />
                    <div className="skeleton_shimmer blog_detail_skeleton_content" />
                    <div className="skeleton_shimmer blog_detail_skeleton_content" />
                    <div className="skeleton_shimmer blog_detail_skeleton_content_short" />
                  </div>
                </div>
              </>
            ) : selectedBlog ? (
              <div className="blog_detail_content">
                <div className="blog_detail_category">
                  <span className="category_tag">
                    {selectedBlog.category?.name || "BEAUTY INSIGHTS"}
                  </span>
                </div>
                <h1 className="blog_detail_title">{selectedBlog.title || "Untitled"}</h1>

                {/* <div className="blog_detail_author_row">
                  <div className="blog_author_info">
                    <img src="/images/fatima.png" alt="Author" className="author_avatar" />
                    <div className="author_details">
                      <span className="author_name">{selectedBlog.posted_by_name || selectedBlog.posted_by || selectedBlog.author || selectedBlog.created_by || "WOMANCART"}</span>
                      <span className="author_date">{formatDate(selectedBlog.created_at)} &bull; 2 min read &bull; 1,234 views</span>
                    </div>
                  </div>
                </div> */}

                <div className="blog_detail_hero_img">
                  <img
                    src={selectedBlog.image || selectedBlog.featured_image || selectedBlog.thumbnail || "/images/bloghd.png"}
                    alt={selectedBlog.title || "Blog"}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/images/bloghd.png";
                    }}
                  />
                </div>

                <div className="blog_detail_text">
                  <div
                    className={`blog_full_content ${!isExpanded ? "truncated" : ""}`}
                    style={{
                      maxHeight: !isExpanded ? "400px" : "none",
                      overflow: "hidden",
                      position: "relative",
                      transition: "max-height 0.3s ease"
                    }}
                  >
                    <div
                      dangerouslySetInnerHTML={{
                        __html:
                          selectedBlog.content ||
                          selectedBlog.description ||
                          "<p>No content available for this blog post.</p>",
                      }}
                    />
                    {/* <div className="inline_quote_box">
                      "The key is to honor the past while embracing the future. Our crafts tell stories that transcend time and borders."
                      <span className="quote_author">— Fatima Al-Hashemi</span>
                    </div> */}
                    {/* <p>
                      Building a sustainable business around traditional crafts requires more than just skill—it demands entrepreneurial spirit and market understanding. Successful artisans have learned to balance authenticity with commercial viability.
                    </p> */}

                    {!isExpanded && (
                      <div style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: "100px",
                        background: "linear-gradient(transparent, white)"
                      }} />
                    )}
                  </div>

                  <div style={{ marginTop: "20px", display: "flex", justifyContent: "center" }}>
                    <Button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="btn_primary"
                      style={{ padding: "10px 30px" }}
                    >
                      {isExpanded ? "Read Less" : "Read More"}
                    </Button>
                  </div>
                </div>

                {Array.isArray(selectedBlog.products) && selectedBlog.products.length > 0 && (
                  <section className="blog_detail_products">
                    <div className="s_head hd_4">
                      <h2>Related Products</h2>
                    </div>
                    <div className="products_card_list gap_m">
                      {selectedBlog.products.map((product, index) => (
                        <ProductCard
                          key={`blog-product-${product.product_id || product.id || index}`}
                          product={mapBlogProductToCard(product)}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            ) : (
              <div style={{ padding: "20px", textAlign: "center" }}>
                Blog not found
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default BlogDetail;
