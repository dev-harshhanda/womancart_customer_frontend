/* eslint-disable @next/next/no-img-element */
"use client";
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  TextField,
} from "@mui/material";
import SocialLinks from "../socialLinks";
import Link from "next/link";
import { useAppSelector } from "@/lib/hook";
import { getToken } from "@/lib/slices/authSlice";
import { getFromStorage } from "@/constants/storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import toast from "react-hot-toast";
import { useMemo, useState } from "react";
import { useSubscribeNewsletterMutation } from "@/service/newsletter";
import { useViewAllCategoryQuery } from "@/service/home";
import { useDashboardHomeQueryArgs } from "@/hooks/useDashboardHomeQueryArgs";
import { buildCategoryUrl } from "@/utils/urlBuilder";
import PublicIcon from '@mui/icons-material/Public';
import {
  APP_STORE_URL,
  GOOGLE_PLAY_URL,
} from "@/constants/appDownload";

const FOOTER_SHOP_CATEGORY_LABELS = [
  "Makeup",
  "Skincare",
  "Fashion",
  "Jewellery",
  "Home & Kitchen",
] as const;

function normalizeCategoryLabel(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function getCategoryDisplayName(category: any): string {
  return String(category?.name || category?.category_name || "").trim();
}

function findCategoryByLabel(categories: any[], label: string) {
  const target = normalizeCategoryLabel(label);
  return categories.find(
    (cat) => normalizeCategoryLabel(getCategoryDisplayName(cat)) === target,
  );
}

function Footer() {
  const token = useAppSelector(getToken);
  const [email, setEmail] = useState("");
  const [subscribeNewsletter, { isLoading: isSubscribing }] = useSubscribeNewsletterMutation();
  const dashboardLocationArgs = useDashboardHomeQueryArgs();
  const { data: categoriesData } = useViewAllCategoryQuery(dashboardLocationArgs);

  const categories = useMemo(() => {
    const fromApi = Array.isArray(categoriesData?.data) ? categoriesData.data : [];
    if (fromApi.length > 0) return fromApi;
    if (typeof window === "undefined") return [];
    try {
      const raw = getFromStorage(STORAGE_KEYS.cachedHeaderCategories);
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [categoriesData?.data]);

  const footerShopLinks = useMemo(
    () =>
      FOOTER_SHOP_CATEGORY_LABELS.map((label) => {
        const category = findCategoryByLabel(categories, label);
        const href = category
          ? buildCategoryUrl([getCategoryDisplayName(category)], {
              categoryIds: category.id || category.category_id,
            })
          : buildCategoryUrl([label], {});
        return { label, href };
      }),
    [categories],
  );

  const getAuthNavigationHref = (path: string, guestPath?: string) => {
    const authToken = token || getFromStorage(STORAGE_KEYS.token);
    if (authToken) return path;
    if (guestPath) return guestPath;
    return `/auth/login?redirect=${encodeURIComponent(path)}`;
  };

  const handleSubscribe = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Please enter your email address.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    try {
      const res = await subscribeNewsletter({
        body: {
          email: trimmed,
          notify_new_products: true,
          notify_new_coupons: true,
          notify_new_offers: true,
        },
      }).unwrap();

      const message =
        (res as any)?.message ||
        (res as any)?.msg ||
        "You have been subscribed to the newsletter.";
      toast.success(message);
      setEmail("");
    } catch (error: any) {
      const message =
        error?.data?.message ||
        error?.data?.msg ||
        "Unable to subscribe right now. Please try again later.";
      toast.error(message);
    }
  };

  return (
    <>
      <footer className="site_footer">
        <div className="container">
          <div className="inner">
            <div className="col_single">
              <h3>Subscribe to Our Newsletter & Get Exclusive Offers</h3>
              <div className="form">
                <TextField
                  fullWidth
                  hiddenLabel
                  placeholder="Enter Your Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <Button
                            type="button"
                            onClick={handleSubscribe}
                            disabled={isSubscribing}
                          >
                            {isSubscribing ? "Subscribing..." : "Subscribe"}
                          </Button>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </div>
              <SocialLinks />
            </div>
            <div className="col_single">
              <h4>SHOP</h4>
              <ul>
                {footerShopLinks.map((item) => (
                  <li key={item.label}>
                    <Box component={Link} href={item.href}>
                      {item.label}
                    </Box>
                  </li>
                ))}
                {/* <li>
                  <Box component={Link} href="/product/product-category">Best Sellers</Box>
                </li>
                <li>
                  <Box component={Link} href="/product/product-category">Global+</Box>
                </li>
                <li>
                  <Box component={Link} href="/product/product-category">Local Shops</Box>
                </li>
                <li>
                  <Box component={Link} href="/product/product-category">New arrivals</Box>
                </li>
                <li>
                  <Box component={Link} href="/">Flash Sales</Box>
                </li> */}
              </ul>
            </div>
            <div className="col_single">
              <h4>COMPANY</h4>
              <ul>
                <li>
                  <Box component={Link} href="/about-us">About us</Box>
                </li>
                {/* <li>
                  <Box component={Link} href="/account/careers">Careers</Box>
                </li> */}
                <li>
                  <Box component={Link} href="/blogs/">Blogs</Box>
                </li>
                {/* <li>
                  <Box component={Link} href="/">News & Media</Box>
                </li> */}
                {/* <li>
                  <Box component={Link} href="/">Affiliates & Creators</Box>
                </li> */}
                {/* <li>
                  <Box component={Link} href="/account/feedback">Feedback</Box>
                </li> */}
                {/* <li>
                  <Box component={Link} href={getAuthNavigationHref("/account/refer-and-earn")}>
                    Refer Friend, Get 20
                  </Box>
                </li> */}
                <li>
                  <Box component={Link} href="/Investor-and-relations">Investor & relations</Box>
                </li>
                <li>
                  <Box component={Link} href="/franchise-opportunity">Franchise Opportunity</Box>
                </li>
              </ul>
            </div>
            <div className="col_single">
              <h4>NEED HELPS</h4>
              <ul>
                <li>
                  <Box component={Link} href="/contact-us">Contact Us</Box>
                </li>
                <li>
                  <Box component={Link} href="/account/help-center">Help center</Box>
                </li>
                <li>
                  <Box component={Link} href={getAuthNavigationHref("/account/orders")}>
                    Track Orders
                  </Box>
                </li>
                <li>
                  <Box
                    component={Link}
                    href={getAuthNavigationHref("/refund-return-policy", "/refund-return-policy")}
                  >
                    Return
                  </Box>
                </li>
              </ul>
            </div>
            <div className="col_single footer_app_download">
              <h4>
                <figure className="footer_app_logo">
                  <img
                    src="/images/womanCart_logo.png"
                    alt="WomanCart"
                    width={120}
                    height={28}
                  />
                </figure>
                <span>Download Womancart App</span>
              </h4>
              <div className="btn_group">
                <IconButton
                  component="a"
                  href={APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Download on the App Store"
                >
                  <figure>
                    <img src="/images/app_store.svg" alt="Download on the App Store" />
                  </figure>
                </IconButton>
                <IconButton
                  component="a"
                  href={GOOGLE_PLAY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Get it on Google Play"
                >
                  <figure>
                    <img src="/images/play_store.svg" alt="Get it on Google Play" />
                  </figure>
                </IconButton>
              </div>
            </div>
          </div>
          {/* WE ACCEPT payment icons — hidden per request
          <div className="we_accept">
            <h5>WE ACCEPT</h5>
            <figure>
              <img src="/images/payment_img.png" alt="img" />
            </figure>
          </div>
          */}
        </div>
        <div className="copywrite">
          <div className="container">
            <ul className="about_web">
              <li>
                <figure>
                  <PublicIcon />
                </figure>
                India
              </li>
              <li>English (US)</li>
              <li>₹ (Rupees)</li>
            </ul>
            <ul className="cms_pages">
              <li>
                <Link href="/">© 2026 Womancart limited</Link>
              </li>
              <li>
                <Link href="/terms-conditions">Terms Of Service</Link>
              </li>
              <li>
                <Link href="/privacy-policy">Privacy Policy</Link>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </>
  );
}

export default Footer;
