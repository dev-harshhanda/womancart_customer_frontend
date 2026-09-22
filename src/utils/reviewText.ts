export const parseReviewCount = (
  count: number | string | null | undefined,
): number => {
  const parsed = Number(count);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
};

export const formatReviewCountText = (count: number | string | null | undefined): string => {
  const safeCount = parseReviewCount(count);
  const reviewWord = safeCount <= 1 ? "Review" : "Reviews";
  return `${safeCount} ${reviewWord}`;
};
