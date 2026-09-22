"use client";

import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Skeleton,
} from "@mui/material";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PublicIcon from "@mui/icons-material/Public";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";

import styles from "./franchise.module.scss";

import {
  useGetFranchiseOpportunityQuery,
  useSubmitFranchiseEnquiryMutation,
  type FranchiseEnquiryBody,
} from "@/service/franchise";

import { resolveCmsMediaUrl } from "@/utils/cmsMedia";

const FRANCHISE_SLUG = "franchise-opportunity";

const PHONE = "918800141841";
const DISPLAY_PHONE = "+91 8800141841";
const EMAIL = "info@womancart.in";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[a-zA-Z\s.'-]{2,50}$/;
const CITY_REGEX = /^[a-zA-Z\s.'-]{2,50}$/;
const MOBILE_REGEX = /^[6-9]\d{9}$/;

const INVESTMENT_OPTIONS = [
  "₹50–60 Lakhs",
  "₹60–80 Lakhs",
  "₹80 Lakhs – ₹1 Crore",
];

const PROPERTY_OPTIONS = [
  "Owned",
  "Rented",
  "Under Negotiation",
];

type HeroFormState = {
  name: string;
  phone: string;
  email: string;
  city: string;
  investment: string;
};

type ContactFormState = {
  name: string;
  email: string;
  phone: string;
  city: string;
  investment: string;
  property: string;
  message: string;
  agree: boolean;
};

type HeroErrors = Partial<Record<keyof HeroFormState, string>>;
type ContactErrors = Partial<Record<keyof ContactFormState, string>>;

const EMPTY_HERO_FORM: HeroFormState = {
  name: "",
  phone: "",
  email: "",
  city: "",
  investment: "",
};

const EMPTY_CONTACT_FORM: ContactFormState = {
  name: "",
  email: "",
  phone: "",
  city: "",
  investment: "",
  property: "",
  message: "",
  agree: false,
};

function normalizePhoneDigits(phone: string) {
  let digits = phone.replace(/\D/g, "");

  if (digits.length > 10 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  return digits.slice(0, 10);
}

function sanitizeName(value: string) {
  return value.replace(/[^a-zA-Z\s.'-]/g, "");
}

function validateHeroForm(values: HeroFormState): HeroErrors {
  const errors: HeroErrors = {};

  if (!values.name.trim()) {
    errors.name = "Full name is required";
  } else if (!NAME_REGEX.test(values.name.trim())) {
    errors.name = "Enter a valid full name";
  }

  const phone = normalizePhoneDigits(values.phone);

  if (!phone) {
    errors.phone = "Contact number is required";
  } else if (!MOBILE_REGEX.test(phone)) {
    errors.phone = "Enter a valid 10-digit mobile number";
  }

  if (!values.email.trim()) {
    errors.email = "Email is required";
  } else if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = "Enter a valid email address";
  }

  if (!values.city.trim()) {
    errors.city = "City is required";
  } else if (!CITY_REGEX.test(values.city.trim())) {
    errors.city = "Enter a valid city";
  }

  if (!values.investment) {
    errors.investment = "Please select investment range";
  }

  return errors;
}

function validateContactForm(values: ContactFormState): ContactErrors {
  const errors: ContactErrors = {};

  if (!values.name.trim()) {
    errors.name = "Full name is required";
  } else if (!NAME_REGEX.test(values.name.trim())) {
    errors.name = "Enter a valid full name";
  }

  const phone = normalizePhoneDigits(values.phone);

  if (!phone) {
    errors.phone = "Mobile number is required";
  } else if (!MOBILE_REGEX.test(phone)) {
    errors.phone = "Enter a valid 10-digit mobile number";
  }

  if (!values.email.trim()) {
    errors.email = "Email is required";
  } else if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = "Enter a valid email address";
  }

  if (!values.city.trim()) {
    errors.city = "City is required";
  } else if (!CITY_REGEX.test(values.city.trim())) {
    errors.city = "Enter a valid city";
  }

  if (!values.investment) {
    errors.investment = "Please select investment range";
  }

  if (!values.property) {
    errors.property = "Please select property status";
  }

  if (!values.agree) {
    errors.agree = "Please confirm your franchise interest";
  }

  if (values.message.length > 500) {
    errors.message = "Message cannot exceed 500 characters";
  }

  return errors;
}

function firstError(errors: Record<string, string | undefined>) {
  return (
    Object.values(errors).find(Boolean) ||
    "Please complete the required fields"
  );
}

export default function FranchiseOpportunityPage() {
  const {
    data: response,
    isLoading,
    isError,
  } = useGetFranchiseOpportunityQuery({
    slug: FRANCHISE_SLUG,
  });

  const [submitEnquiry, { isLoading: isSubmitting }] =
    useSubmitFranchiseEnquiryMutation();

  const page = response?.data;
  const content = page?.content;

  const [heroForm, setHeroForm] =
    useState<HeroFormState>(EMPTY_HERO_FORM);

  const [contactForm, setContactForm] =
    useState<ContactFormState>(EMPTY_CONTACT_FORM);

  const [heroErrors, setHeroErrors] =
    useState<HeroErrors>({});

  const [contactErrors, setContactErrors] =
    useState<ContactErrors>({});

  /*
   * Hide existing application header/footer only while
   * this franchise page is mounted.
   *
   * Add/remove selectors here based on your existing project.
   */
  useEffect(() => {
    document.body.classList.add("franchise-page-active");

    const contentElement = document.querySelector<HTMLElement>("body .content");
    // const oldContentPadding = contentElement?.style.padding || "";

    if (contentElement) {
      contentElement.style.padding = "0";
    }
    

    const selectors = [
      "body > header:not([data-franchise-header])",
      "body > footer:not([data-franchise-footer])",
      "#main-header",
      "#main-footer",
      ".main-header",
      ".main-footer",
      ".site-header",
      ".site-footer",
      ".site_header",
      ".site_footer",
    ];

    const hiddenElements: Array<{
      element: HTMLElement;
      display: string;
    }> = [];

    selectors.forEach((selector) => {
      try {
        document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
          if (
            element.closest("[data-franchise-page]") ||
            element.dataset.franchiseHidden === "true"
          ) {
            return;
          }

          hiddenElements.push({
            element,
            display: element.style.display,
          });

          element.dataset.franchiseHidden = "true";
          element.style.display = "none";
        });
      } catch {
        // Ignore selector errors
      }
    });

    return () => {
      document.body.classList.remove("franchise-page-active");

      hiddenElements.forEach(({ element, display }) => {
        element.style.display = display;
        delete element.dataset.franchiseHidden;
      });
    };
  }, []);

  const galleryImages = useMemo(() => {
    const urls = (content?.gallery?.image_urls ?? [])
      .map((url) => resolveCmsMediaUrl(url))
      .filter(Boolean) as string[];

    if (urls.length) return urls;

    const images = (content?.gallery?.images ?? [])
      .map((image) => {
        if (typeof image === "string") {
          return resolveCmsMediaUrl(image);
        }

        if (image && typeof image === "object") {
          const record = image as Record<string, unknown>;

          return resolveCmsMediaUrl(
            (record.url ??
              record.image_url ??
              record.imageUrl ??
              record.path) as string,
          );
        }

        return null;
      })
      .filter(Boolean) as string[];

    if (images.length) return images;

    return [
      "https://archive.womancart.in/assetss/img/store1.jpg",
      "https://archive.womancart.in/assetss/img/store2.jpg",
      "https://archive.womancart.in/assetss/img/store3.jpg",
      "https://archive.womancart.in/assetss/img/store4.jpg",
    ];
  }, [content?.gallery]);

  const aboutImage =
    resolveCmsMediaUrl(content?.deserves_section?.image_url) ||
    resolveCmsMediaUrl(content?.deserves_section?.image) ||
    "https://archive.womancart.in/assetss/img/store3.jpg";

  const cmsFaqs = (content?.faqs ?? []).filter(
    (faq) =>
      faq.status !== false &&
      faq.question &&
      faq.answer,
  );

  const defaultFaqs = [
    {
      question: "What is the minimum & typical investment?",
      answer:
        "₹50 Lakhs – ₹1 Crore, including interiors, branding, initial inventory and technology. Final investment depends on store size, location and city.",
    },
    {
      question:
        "Is this fully company-managed or a traditional franchise?",
      answer:
        "This is a 100% company-managed model. WomanCart handles operations, hiring, marketing, technology and reporting.",
    },
    {
      question: "How do you claim 0% risk?",
      answer:
        "The operating structure is designed to reduce day-to-day operational exposure through centralized procurement, standard operating procedures and company-managed operations. Detailed investment terms are shared during due diligence.",
    },
    {
      question: "What ROI can I realistically expect?",
      answer:
        "Projected returns may reach up to 90% over 5 years based on the franchise model and store performance. Actual returns can vary according to location, sales and other commercial factors.",
    },
    {
      question:
        "What property size and location do you require?",
      answer:
        "Approximately 200–1,500 sq. ft., preferably street-facing, inside a mall or in a premium market. Square or rectangular properties are generally preferred.",
    },
    {
      question:
        "Will I be involved in daily operations?",
      answer:
        "The model is designed to be hands-free for investors because WomanCart manages store operations end-to-end.",
    },
    {
      question: "How long does setup take?",
      answer:
        "Setup typically takes approximately 45–60 days from agreement signing, subject to property readiness, approvals and permissions.",
    },
    {
      question: "What documentation is required?",
      answer:
        "Common documents include PAN, identity and address proof, bank statements, income-related documents and property documentation where applicable.",
    },
    {
      question: "Is there a franchise fee?",
      answer:
        "The commercial structure and complete investment breakup are shared with shortlisted franchise applicants during the evaluation process.",
    },
  ];

  const faqs = cmsFaqs.length ? cmsFaqs : defaultFaqs;

  const updateHeroField = <K extends keyof HeroFormState>(
    field: K,
    value: HeroFormState[K],
  ) => {
    setHeroForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setHeroErrors((previous) => ({
      ...previous,
      [field]: undefined,
    }));
  };

  const updateContactField = <
    K extends keyof ContactFormState,
  >(
    field: K,
    value: ContactFormState[K],
  ) => {
    setContactForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setContactErrors((previous) => ({
      ...previous,
      [field]: undefined,
    }));
  };

  const submitForm = async (
    payload: FranchiseEnquiryBody,
    reset: () => void,
  ) => {
    try {
      const result = await submitEnquiry({
        ...payload,
        slug: FRANCHISE_SLUG,
      }).unwrap();

      toast.success(
        result?.message ||
          "Franchise request submitted successfully!",
      );

      reset();
    } catch (error: unknown) {
      const message =
        (error as { data?: { message?: string } })
          ?.data?.message ||
        "Failed to submit franchise request. Please try again.";

      toast.error(message);
    }
  };

  const handleHeroSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const errors = validateHeroForm(heroForm);

    if (Object.keys(errors).length) {
      setHeroErrors(errors);
      toast.error(firstError(errors));
      return;
    }

    const message = [
      `Investment Range: ${heroForm.investment}`,
      "Form: Hero Investor Pack",
    ].join("\n");

    await submitForm(
      {
        name: heroForm.name.trim(),
        phone: normalizePhoneDigits(heroForm.phone),
        email: heroForm.email.trim(),
        city: heroForm.city.trim(),
        message,
        source: "hero_form",
      },
      () => {
        setHeroForm(EMPTY_HERO_FORM);
        setHeroErrors({});
      },
    );
  };

  const handleContactSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const errors = validateContactForm(contactForm);

    if (Object.keys(errors).length) {
      setContactErrors(errors);
      toast.error(firstError(errors));
      return;
    }

    /*
     * Investment + property are added to message so
     * your existing backend does not need modification.
     */
    const message = [
      `Investment Range: ${contactForm.investment}`,
      `Property Status: ${contactForm.property}`,
      contactForm.message.trim()
        ? `Message: ${contactForm.message.trim()}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    await submitForm(
      {
        name: contactForm.name.trim(),
        phone: normalizePhoneDigits(contactForm.phone),
        email: contactForm.email.trim(),
        city: contactForm.city.trim(),
        message,
        source: "bottom_form",
      },
      () => {
        setContactForm(EMPTY_CONTACT_FORM);
        setContactErrors({});
      },
    );
  };

  const openHeroWhatsApp = () => {
    const errors = validateHeroForm(heroForm);

    if (Object.keys(errors).length) {
      setHeroErrors(errors);
      toast.error(firstError(errors));
      return;
    }

    const message = [
      "Hi, I am interested in the WomanCart franchise opportunity.",
      "",
      `Name: ${heroForm.name.trim()}`,
      `Mobile: ${normalizePhoneDigits(heroForm.phone)}`,
      `Email: ${heroForm.email.trim()}`,
      `City: ${heroForm.city.trim()}`,
      `Investment Range: ${heroForm.investment}`,
    ].join("\n");

    window.open(
      `https://wa.me/${PHONE}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const scrollToContact = () => {
    document.getElementById("contact")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  if (isError) {
    return (
      <div className={styles.errorPage}>
        <h2>Unable to load franchise page</h2>
        <p>Please try again later.</p>
      </div>
    );
  }

  return (
    <div
      className={styles.franchisePage}
      data-franchise-page
    >

      {/* NEW FRANCHISE HEADER */}

      <header
        className={styles.franchiseHeader}
        data-franchise-header
      >
        <div className={styles.headerInner}>
          <a
            href="/"
            className={styles.logoWrap}
            aria-label="WomanCart Home"
          >
            <img
              src="https://archive.womancart.in/assetss/img/logo.webp"
              alt="WomanCart"
            />
          </a>

          <div className={styles.headerRight}>
            <div className={styles.contactDetails}>
              <a href={`tel:+${PHONE}`}>
                <PhoneIcon />
                {DISPLAY_PHONE}
              </a>

              <a href={`mailto:${EMAIL}`}>
                <EmailOutlinedIcon />
                {EMAIL}
              </a>
            </div>

            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={scrollToContact}
              >
                Apply
              </button>

              <a
                href={`https://wa.me/${PHONE}`}
                target="_blank"
                rel="noreferrer"
                className={styles.whatsappButton}
              >
                <WhatsAppIcon />
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* HERO */}

      <section className={styles.heroSection}>
        <div className={styles.container}>
          <div className={styles.heroGrid}>
            <div className={styles.heroContent}>
              {isLoading ? (
                <>
                  <Skeleton
                    variant="text"
                    height={75}
                    width="90%"
                  />
                  <Skeleton
                    variant="text"
                    height={35}
                    width="75%"
                  />
                  <Skeleton
                    variant="text"
                    height={30}
                    width="85%"
                  />
                </>
              ) : (
                <>
                  <h1>
                    {content?.hero?.title ||
                      "Bring WomanCart to Your City"}
                  </h1>

                  <p className={styles.heroSubtitle}>
                    {content?.hero?.subtitle ||
                      "Own a Franchise That Empowers, Delivers & Grows"}
                  </p>

                  <p className={styles.heroDescription}>
                    Hassle-Free Investment • 0% Risk on
                    Investment • High ROI up to 90% in 5
                    Years
                  </p>

                  <button
                    type="button"
                    className={styles.primaryButtonLarge}
                    onClick={scrollToContact}
                  >
                    {content?.hero?.cta_label ||
                      "Apply for a Franchise"}
                  </button>

                  <div className={styles.badges}>
                    <span>0% Risk on Investment</span>
                    <span>100% Company Managed</span>
                    <span>₹50 Lakhs – ₹1 Crore</span>
                    <span>200–1,500 sq. ft.</span>
                  </div>
                </>
              )}
            </div>

            {/* HERO FORM */}

            <div className={styles.formCard}>
              <h3>Get an Investor Pack &amp; Callback</h3>

              <p className={styles.formDescription}>
                Fill this and our team will contact you
                regarding the WomanCart franchise opportunity.
              </p>

              <form
                onSubmit={handleHeroSubmit}
                className={styles.form}
                noValidate
              >
                <div className={styles.formGroup}>
                  <label>Full Name*</label>

                  <input
                    type="text"
                    value={heroForm.name}
                    onChange={(event) =>
                      updateHeroField(
                        "name",
                        sanitizeName(event.target.value),
                      )
                    }
                    placeholder="Enter your full name"
                    className={
                      heroErrors.name ? styles.inputError : ""
                    }
                  />

                  {heroErrors.name && (
                    <span className={styles.fieldError}>
                      {heroErrors.name}
                    </span>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>Contact Number*</label>

                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={heroForm.phone}
                    onChange={(event) =>
                      updateHeroField(
                        "phone",
                        normalizePhoneDigits(
                          event.target.value,
                        ),
                      )
                    }
                    placeholder="9876543210"
                    className={
                      heroErrors.phone
                        ? styles.inputError
                        : ""
                    }
                  />

                  {heroErrors.phone && (
                    <span className={styles.fieldError}>
                      {heroErrors.phone}
                    </span>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>Email*</label>

                  <input
                    type="email"
                    value={heroForm.email}
                    onChange={(event) =>
                      updateHeroField(
                        "email",
                        event.target.value,
                      )
                    }
                    placeholder="name@example.com"
                    className={
                      heroErrors.email
                        ? styles.inputError
                        : ""
                    }
                  />

                  {heroErrors.email && (
                    <span className={styles.fieldError}>
                      {heroErrors.email}
                    </span>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>City*</label>

                  <input
                    type="text"
                    value={heroForm.city}
                    onChange={(event) =>
                      updateHeroField(
                        "city",
                        sanitizeName(event.target.value),
                      )
                    }
                    placeholder="Enter your city"
                    className={
                      heroErrors.city ? styles.inputError : ""
                    }
                  />

                  {heroErrors.city && (
                    <span className={styles.fieldError}>
                      {heroErrors.city}
                    </span>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>Investment Range*</label>

                  <select
                    value={heroForm.investment}
                    onChange={(event) =>
                      updateHeroField(
                        "investment",
                        event.target.value,
                      )
                    }
                    className={
                      heroErrors.investment
                        ? styles.inputError
                        : ""
                    }
                  >
                    <option value="">
                      Select investment range
                    </option>

                    {INVESTMENT_OPTIONS.map((option) => (
                      <option
                        key={option}
                        value={option}
                      >
                        {option}
                      </option>
                    ))}
                  </select>

                  {heroErrors.investment && (
                    <span className={styles.fieldError}>
                      {heroErrors.investment}
                    </span>
                  )}
                </div>

                <div className={styles.formActions}>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={styles.primaryButton}
                  >
                    {isSubmitting
                      ? "Sending..."
                      : "Request Callback"}
                  </button>

  <a
          href={`https://wa.me/${PHONE}`}
          target="_blank"
          rel="noreferrer"
          className={styles.whatsappButton}
          aria-label="Chat with WomanCart on WhatsApp"
        >
          <WhatsAppIcon />
          <span>WhatsApp</span>
        </a>

                  {/* <button
                    type="button"
                    className={styles.whatsappButton}
                    onClick={openHeroWhatsApp}
                  >
                    <WhatsAppIcon />
                    Chat on WhatsApp
                  </button> */}
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}

      <section
        id="about"
        className={styles.section}
      >
        <div className={styles.container}>
          <div className={styles.aboutGrid}>
            <div>
              <h2 className={styles.sectionTitle}>
                {content?.deserves_section?.title ||
                  "Because She Deserves It All"}
              </h2>

              {content?.deserves_section?.content ? (
                <div
                  className={styles.contentText}
                  dangerouslySetInnerHTML={{
                    __html:
                      content.deserves_section.content,
                  }}
                />
              ) : (
                <p className={styles.contentText}>
                  WomanCart Limited is redefining how Indian
                  women shop, discover and experience lifestyle
                  products. With thousands of products,
                  home-grown brands and a growing offline
                  footprint, WomanCart bridges online
                  convenience with meaningful offline retail
                  experiences.
                </p>
              )}
            </div>

            <div>
              {isLoading ? (
                <Skeleton
                  variant="rectangular"
                  height={400}
                  className={styles.imageSkeleton}
                />
              ) : (
                <img
                  src={aboutImage}
                  alt="WomanCart Store"
                  className={styles.aboutImage}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* WHY PARTNER */}

      <section className={styles.pinkSection}>
        <div className={styles.container}>
          <h2 className={styles.centerTitle}>
            {content?.why_partner?.title ||
              "Why Partner with WomanCart?"}
          </h2>

          <div className={styles.partnerGrid}>
            <div className={styles.partnerCard}>
              <div className={styles.iconCircle}>
                <ShieldOutlinedIcon />
              </div>

              <h3>0% Risk on Investment</h3>

              <p>
                A company-managed operating structure designed
                to minimize your day-to-day business exposure.
              </p>
            </div>

            <div className={styles.partnerCard}>
              <div className={styles.iconCircle}>
                <TrendingUpIcon />
              </div>

              <h3>Strong ROI Potential</h3>

              <p>
                Projected returns of up to 90% across a five-year
                business tenure.
              </p>
            </div>

            <div className={styles.partnerCard}>
              <div className={styles.iconCircle}>
                <PublicIcon />
              </div>

              <h3>Pan-India Support</h3>

              <p>
                Brand recognition, centralized operations and
                continuous marketing support.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BUSINESS MODEL */}

      <section
        id="model"
        className={styles.section}
      >
        <div className={styles.container}>
          <h2 className={styles.centerTitle}>
            {content?.program?.title ||
              "The WomanCart Franchise Program"}
          </h2>

          <p className={styles.centerDescription}>
            {content?.program?.description ||
              "Join a business designed for investors who want growth without the day-to-day operational workload. You invest in the setup while our team manages the store, inventory, staffing, marketing and customer experience."}
          </p>

          <div className={styles.metricsCard}>
            <div>
              <strong>Investment</strong>
              <span>₹50 Lakhs – ₹1 Crore</span>
            </div>

            <div>
              <strong>ROI</strong>
              <span>Up to 90% in 5 Years</span>
            </div>

            <div>
              <strong>Tenure</strong>
              <span>5 Years</span>
            </div>

            <div>
              <strong>Model</strong>
              <span>100% Company Managed</span>
            </div>
          </div>
        </div>
      </section>

      {/* STORE GALLERY */}

      <section className={styles.gallerySection}>
        <div className={styles.container}>
          <h2 className={styles.centerTitle}>
            {content?.gallery?.title || "Store Gallery"}
          </h2>

          <p className={styles.centerDescription}>
            Actual WomanCart / LUXE store fixtures, displays
            and layouts.
          </p>

          <div className={styles.galleryGrid}>
            {galleryImages.slice(0, 4).map((image, index) => (
              <img
                key={`${image}-${index}`}
                src={image}
                alt={`WomanCart Store ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* SUPPORT */}

      <section className={styles.section}>
        <div className={styles.container}>
          <h2 className={styles.centerTitle}>
            {content?.support?.title ||
              "Comprehensive Support System"}
          </h2>

          <div className={styles.supportGrid}>
            {content?.support?.items?.length
              ? content.support.items.map(
                  (item, index) => (
                    <div
                      className={styles.supportCard}
                      key={`${item.title}-${index}`}
                    >
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                  ),
                )
              : [
                  {
                    title: "Pre-Launch",
                    description:
                      "Site evaluation, design, staff hiring and training.",
                  },
                  {
                    title: "Launch",
                    description:
                      "Grand opening activities, marketing and promotional support.",
                  },
                  {
                    title: "Post-Launch",
                    description:
                      "Ongoing campaigns, performance analysis and business support.",
                  },
                  {
                    title: "Technology",
                    description:
                      "POS, CRM and data-driven reporting infrastructure.",
                  },
                ].map((item) => (
                  <div
                    className={styles.supportCard}
                    key={item.title}
                  >
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                ))}
          </div>
        </div>
      </section>

      {/* FAQ */}

      <section className={styles.faqSection}>
        <div className={styles.faqContainer}>
          <h2 className={styles.centerTitle}>
            Frequently Asked Questions
          </h2>

          <div className={styles.faqList}>
            {faqs.map((faq, index) => (
              <Accordion
                key={`${faq.question}-${index}`}
                className={styles.accordion}
                disableGutters
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  className={styles.accordionSummary}
                >
                  <span>{faq.question}</span>
                </AccordionSummary>

                <AccordionDetails
                  className={styles.accordionDetails}
                >
                  {faq.answer}
                </AccordionDetails>
              </Accordion>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}

      <section
        id="contact"
        className={styles.contactSection}
      >
        <div className={styles.container}>
          <h2 className={styles.centerTitle}>
            {content?.bottom_cta?.title ||
              "Start Your WomanCart Franchise Journey"}
          </h2>

          <p className={styles.centerDescription}>
            {content?.bottom_cta?.subtitle ||
              "Share your details and our franchise team will connect with you."}
          </p>

          <form
            className={styles.contactForm}
            onSubmit={handleContactSubmit}
            noValidate
          >
            <FormField
              placeholder="Full Name *"
              value={contactForm.name}
              error={contactErrors.name}
              onChange={(value) =>
                updateContactField(
                  "name",
                  sanitizeName(value),
                )
              }
            />

            <FormField
              type="email"
              placeholder="Email Address *"
              value={contactForm.email}
              error={contactErrors.email}
              onChange={(value) =>
                updateContactField("email", value)
              }
            />

            <FormField
              type="tel"
              placeholder="Mobile Number *"
              value={contactForm.phone}
              error={contactErrors.phone}
              maxLength={10}
              onChange={(value) =>
                updateContactField(
                  "phone",
                  normalizePhoneDigits(value),
                )
              }
            />

            <FormField
              placeholder="City *"
              value={contactForm.city}
              error={contactErrors.city}
              onChange={(value) =>
                updateContactField(
                  "city",
                  sanitizeName(value),
                )
              }
            />

            <div className={styles.formGroup}>
              <select
                value={contactForm.investment}
                onChange={(event) =>
                  updateContactField(
                    "investment",
                    event.target.value,
                  )
                }
                className={
                  contactErrors.investment
                    ? styles.inputError
                    : ""
                }
              >
                <option value="">
                  Investment Range *
                </option>

                {INVESTMENT_OPTIONS.map((option) => (
                  <option
                    value={option}
                    key={option}
                  >
                    {option}
                  </option>
                ))}
              </select>

              {contactErrors.investment && (
                <span className={styles.fieldError}>
                  {contactErrors.investment}
                </span>
              )}
            </div>

            <div className={styles.formGroup}>
              <select
                value={contactForm.property}
                onChange={(event) =>
                  updateContactField(
                    "property",
                    event.target.value,
                  )
                }
                className={
                  contactErrors.property
                    ? styles.inputError
                    : ""
                }
              >
                <option value="">
                  Property Status *
                </option>

                {PROPERTY_OPTIONS.map((option) => (
                  <option
                    value={option}
                    key={option}
                  >
                    {option}
                  </option>
                ))}
              </select>

              {contactErrors.property && (
                <span className={styles.fieldError}>
                  {contactErrors.property}
                </span>
              )}
            </div>

            <div
              className={`${styles.formGroup} ${styles.fullWidth}`}
            >
              <textarea
                rows={5}
                maxLength={500}
                value={contactForm.message}
                placeholder="Message / Query (Optional)"
                onChange={(event) =>
                  updateContactField(
                    "message",
                    event.target.value,
                  )
                }
                className={
                  contactErrors.message
                    ? styles.inputError
                    : ""
                }
              />

              {contactErrors.message && (
                <span className={styles.fieldError}>
                  {contactErrors.message}
                </span>
              )}
            </div>

            <div
              className={`${styles.checkboxWrap} ${styles.fullWidth}`}
            >
              <label>
                <input
                  type="checkbox"
                  checked={contactForm.agree}
                  onChange={(event) =>
                    updateContactField(
                      "agree",
                      event.target.checked,
                    )
                  }
                />

                <span>
                  I confirm my interest in becoming a WomanCart
                  Franchise Partner.
                </span>
              </label>

              {contactErrors.agree && (
                <span className={styles.fieldError}>
                  {contactErrors.agree}
                </span>
              )}
            </div>

            <div
              className={`${styles.contactActions} ${styles.fullWidth}`}
            >
              <button
                type="submit"
                disabled={isSubmitting}
                className={styles.primaryButtonLarge}
              >
                {isSubmitting
                  ? "Sending..."
                  : content?.bottom_cta?.submit_label ||
                    "Send My Franchise Interest"}
              </button>

              <a
                href={`https://wa.me/${PHONE}`}
                target="_blank"
                rel="noreferrer"
                className={styles.whatsappLargeButton}
              >
                <WhatsAppIcon />
                WhatsApp Our Team
              </a>
            </div>

            <p
              className={`${styles.privacyText} ${styles.fullWidth}`}
            >
              Confidential &amp; Verified Process — Your
              information will only be used for franchise
              communication.
            </p>
          </form>
        </div>
      </section>

      {/* NEW FRANCHISE FOOTER */}

      <footer
        className={styles.franchiseFooter}
        data-franchise-footer
      >
        <div className={styles.container}>
          <div className={styles.footerContact}>
            <a href={`tel:+${PHONE}`}>
              <PhoneIcon />
              {DISPLAY_PHONE}
            </a>

            <a href={`mailto:${EMAIL}`}>
              <EmailOutlinedIcon />
              {EMAIL}
            </a>

            <span>
              🏢 Head Office: WomanCart Limited, Delhi NCR,
              India
            </span>
          </div>

          <p>
            © {new Date().getFullYear()} WomanCart Limited. All
            Rights Reserved.
          </p>

          <p className={styles.footerTagline}>
            Empowering women, one store at a time.
          </p>
        </div>
      </footer>

      {/* FLOATING WHATSAPP */}

      <a
        href={`https://wa.me/${PHONE}`}
        target="_blank"
        rel="noreferrer"
        className={styles.floatingWhatsapp}
        aria-label="Chat with WomanCart on WhatsApp"
      >
        <WhatsAppIcon />
        <span>WhatsApp</span>
      </a>
    </div>
  );
}

type FormFieldProps = {
  type?: React.HTMLInputTypeAttribute;
  placeholder: string;
  value: string;
  error?: string;
  maxLength?: number;
  onChange: (value: string) => void;
};

function FormField({
  type = "text",
  placeholder,
  value,
  error,
  maxLength,
  onChange,
}: FormFieldProps) {
  return (
    <div className={styles.formGroup}>
      <input
        type={type}
        inputMode={type === "tel" ? "numeric" : undefined}
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className={error ? styles.inputError : ""}
      />

      {error && (
        <span className={styles.fieldError}>
          {error}
        </span>
      )}
    </div>
  );
}