/* eslint-disable @next/next/no-img-element */
import React from 'react'
import { useRouter } from 'next/navigation'
import { FeaturedBrand } from "@/types/General";
import { getBannerNavigationUrl } from "@/utils/bannerNavigation";

interface HomeFestiveProps {
  items: FeaturedBrand[];
  title?: string;
  titleImage?: string | null;
  backgroundImage?: string | null;
  /** When false, hides `display_name` text only; `title_image` still renders if set. */
  showTitle?: boolean;
}

function HomeFestive({
  items,
  title = "Festive Specials",
  titleImage,
  backgroundImage,
  showTitle = true,
}: HomeFestiveProps) {
  const router = useRouter();

  if (!items || items.length === 0) {
    return null; // Don't render if no items are provided
  }

  const containerStyle =
    backgroundImage != null && backgroundImage !== ""
      ? { backgroundImage: `url(${backgroundImage})` }
      : undefined;

  const headingImgStyle = {
    maxWidth: "100%" as const,
    height: "auto" as const,
    marginInline: "auto" as const,
  };

  const trimmedDisplayName = typeof title === "string" ? title.trim() : "";
  const hasHeadingImage = titleImage != null && titleImage !== "";
  const headingText =
    trimmedDisplayName || (hasHeadingImage ? "" : "Festive Specials");
  const showHeadingBlock = hasHeadingImage || showTitle;
  const showDisplayNameText = showTitle && Boolean(headingText);

  return (
    <>
      <section className="home_festive_sc">
        <div className="container" style={containerStyle}>
          {showHeadingBlock ? (
            <div className="s_head text_center">
              <h2 className="f_Jost">
                {titleImage ? (
                  <img
                    src={titleImage}
                    alt={trimmedDisplayName || "Festive title"}
                    className="d_block"
                    style={headingImgStyle}
                  />
                ) : null}
                {showDisplayNameText ? (
                  <span
                    className={hasHeadingImage ? "d_block" : undefined}
                    style={hasHeadingImage ? { marginTop: "0.5rem" } : undefined}
                  >
                    {headingText}
                  </span>
                ) : null}
              </h2>
            </div>
          ) : null}

          <div className="festive_grid gap_m">
            {items.map((item, index) => (
              <div
                key={index}
                className="festive_item"
                onClick={() => router.push(getBannerNavigationUrl(item))}
              >
                <img src={item.image} alt={item.title || "Festive Image"} />
                {/* <p>{item.title}</p> */}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

export default HomeFestive