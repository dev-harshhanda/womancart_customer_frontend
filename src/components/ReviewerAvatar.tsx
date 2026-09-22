"use client";

import React from "react";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";

function isValidPhotoUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return false;
  return true;
}

export function getReviewerPhotoUrl(
  review: Record<string, unknown> | null | undefined,
): string | null {
  if (!review) return null;

  const user = review.user as Record<string, unknown> | undefined;
  const customer = review.customer as Record<string, unknown> | undefined;

  const candidates = [
    review.user_avatar,
    review.avatar,
    review.profile_image,
    review.user_image,
    review.image,
    user?.avatar,
    user?.profile_image,
    user?.image,
    user?.image_url,
    customer?.avatar,
    customer?.profile_image,
    customer?.image,
  ];

  for (const candidate of candidates) {
    if (isValidPhotoUrl(candidate)) return candidate.trim();
  }

  return null;
}

type Props = {
  review: Record<string, unknown>;
  name?: string;
};

export default function ReviewerAvatar({ review, name }: Props) {
  const photoUrl = getReviewerPhotoUrl(review);
  const [imageError, setImageError] = React.useState(false);
  const showPlaceholder = !photoUrl || imageError;

  React.useEffect(() => {
    setImageError(false);
  }, [photoUrl]);

  return (
    <figure>
      {showPlaceholder ? (
        <AccountCircleOutlinedIcon
          aria-hidden
          sx={{
            display: "block",
            height: "100%",
            width: "100%",
            color: "#000000",
          }}
        />
      ) : (
        <img
          src={photoUrl}
          alt={name || "User"}
          onError={() => setImageError(true)}
        />
      )}
    </figure>
  );
}
