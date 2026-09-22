/* eslint-disable @next/next/no-img-element */
"use client";
import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  useGetBlogsListMutation,
} from "@/service/blog";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Button, Tabs, Tab, Box } from "@mui/material";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

dayjs.extend(relativeTime);

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
    id?: number;
    name?: string;
    category_name?: string;
  };
}

function BlogsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categoriesWithBlogs, setCategoriesWithBlogs] = useState<
    { id: number; name: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);

  const [getBlogsList, { isLoading: blogsLoading }] = useGetBlogsListMutation();

  const buildCategoriesFromBlogs = (blogsData: Blog[]) => {
    const categoryMap = new Map<number, { id: number; name: string }>();
    blogsData.forEach((blog) => {
      const cat = blog.category;
      const id = Number(cat?.id);
      const name = String(cat?.name || cat?.category_name || "").trim();
      if (Number.isFinite(id) && id > 0 && name) {
        categoryMap.set(id, { id, name });
      }
    });
    return Array.from(categoryMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  };

  const visibleCategories = React.useMemo(
    () => [{ id: 0, name: "All" }, ...categoriesWithBlogs],
    [categoriesWithBlogs],
  );

  const sliderSettings = {
    dots: false,
    infinite: false,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    arrows: true,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };

  const blogsByCategory = React.useMemo(() => {
    const groups: Record<string, { blogs: Blog[]; id: number }> = {};
    blogs.forEach((blog: any) => {
      const cat = blog.category || { id: 0, name: "Uncategorized" };
      if (!groups[cat.name]) groups[cat.name] = { blogs: [], id: cat.id };
      groups[cat.name].blogs.push(blog);
    });
    return groups;
  }, [blogs]);

  const fetchBlogs = async (categoryId?: string | number) => {
    try {
      setLoading(true);
      const response = await getBlogsList({
        page: 1,
        limit: 20, // Fetch more to get a better distribution for 'All' view
        ...(categoryId && categoryId !== 0 ? { categoryId } : {}),
      }).unwrap();

      const list = response?.data;
      const blogsData = Array.isArray(list?.data)
        ? (list.data as Blog[])
        : [];

      setBlogs(blogsData);
      if (!categoryId || Number(categoryId) === 0) {
        setCategoriesWithBlogs(buildCategoriesFromBlogs(blogsData));
      }
    } catch {
      setBlogs([]);
      if (!categoryId || Number(categoryId) === 0) {
        setCategoriesWithBlogs([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const catId = searchParams.get("categoryId");
    if (catId) {
      const index = visibleCategories.findIndex((c) => String(c.id) === catId);
      if (index !== -1) {
        setTabValue(index);
        void fetchBlogs(catId);
        return;
      }
      setTabValue(0);
    } else {
      setTabValue(0);
    }
    void fetchBlogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const catId = searchParams.get("categoryId");
    if (!catId) return;
    const index = visibleCategories.findIndex((c) => String(c.id) === catId);
    if (index !== -1) {
      setTabValue(index);
    }
  }, [searchParams, visibleCategories]);

  useEffect(() => {
    if (tabValue >= visibleCategories.length) {
      setTabValue(0);
    }
  }, [tabValue, visibleCategories.length]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    const selectedCategory = visibleCategories[newValue];
    const newParams = new URLSearchParams(searchParams.toString());
    if (selectedCategory.id === 0) {
      newParams.delete("categoryId");
    } else {
      newParams.set("categoryId", String(selectedCategory.id));
    }
    router.push(`/blogs?${newParams.toString()}`);
  };

  const handleBlogClick = (blog: Blog) => {
    const identifier = blog.slug || blog.id;
    if (identifier) {
      router.push(`/blogs/${identifier}`);
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

  const stripHtmlTags = (html?: string) => {
    if (!html) return "";
    // Remove HTML tags using regex
    // eslint-disable-next-line sonarjs/no-duplicate-string
    const text = html.replace(/<[^>]*>/g, "");
    // Decode HTML entities
    if (typeof document !== "undefined") {
      const textarea = document.createElement("textarea");
      textarea.innerHTML = text;
      return textarea.value;
    }
    return text;
  };

  return (
    <>
      <div className="container u_spc">
        <div className="blog_header_section">
          <h2>Blogs</h2>
          <div className="site_tabs2">
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              aria-label="blog categories"
            >
              {visibleCategories.map((cat) => (
                <Tab key={cat.id} label={cat.name} />
              ))}
            </Tabs>
          </div>
        </div>

        <div className="blog_wrpr full_view">
          <div className="blg_lft">
            {loading || blogsLoading ? (
              <>
                <p className="blog_loading_text">Loading blogs...</p>
                <ul>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <li key={index} className="blog_skeleton_item">
                      <div className="article-card">
                        <figure className="card-image">
                          <div className="skeleton_shimmer blog_skeleton_image" />
                        </figure>
                        <div className="card-content">
                          <div className="skeleton_shimmer blog_skeleton_title" />
                          <div className="skeleton_shimmer blog_skeleton_description" />
                          <div className="skeleton_shimmer blog_skeleton_description_short" />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : blogs.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center" }}>
                No blogs found
              </div>
            ) : tabValue === 0 ? (
              /* Grouped View for 'All' tab */
              Object.entries(blogsByCategory).map(([catName, group]) => (
                <div key={catName} className="blog_section mb_40">
                  <div className="s_head flex hd_6 border_none" style={{ marginBottom: "20px" }}>
                    <h2 style={{ fontSize: "24px", textTransform: "uppercase" }}>{catName}</h2>
                    <Button
                      onClick={() => {
                        const index = visibleCategories.findIndex(
                          (c) => c.name === catName,
                        );
                        if (index !== -1) handleTabChange({} as any, index);
                      }}
                      className="btn_primary"
                      style={{ padding: "6px 12px", fontSize: "14px", textTransform: "uppercase" }}
                    >
                      Read All {catName} &gt;
                    </Button>
                  </div>
                  <div className="blog_slider_wrpr">
                    <Slider {...sliderSettings}>
                      {group.blogs.map((blog, index) => (
                        <div onClick={() => handleBlogClick(blog)} key={blog.id || index} className="blg_lst_item">
                          <div
                            className="blg_lst"
                            style={{ cursor: "pointer" }}
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
                                <Button className="btn_primary more_btn" style={{ padding: "8px 16px", cursor: "pointer", border: "none", borderRadius: "4px" }}>
                                  Read More
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </Slider>
                  </div>
                </div>
              ))
            ) : (
              /* List View for specific Category */
              <ul>
                {blogs.map((blog, index) => (
                  <li
                    key={blog.id || index}
                    className="blg_lst"
                    style={{ cursor: "pointer" }}
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
                        <Button onClick={() => handleBlogClick(blog)} className="btn_primary more_btn" style={{ padding: "8px 16px", cursor: "pointer", border: "none", borderRadius: "4px" }}>
                          Read More
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

    </>
  );
}

export default function Blogs() {
  return (
    <Suspense fallback={<p className="blog_loading_text">Loading blogs...</p>}>
      <BlogsContent />
    </Suspense>
  );
}
