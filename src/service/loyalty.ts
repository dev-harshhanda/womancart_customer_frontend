import { END_POINTS } from "@/constants/url";
import emptySplitApi from "@/lib/rtk";
import { CommonResponseType } from "@/types/General";

export interface BadgeInfo {
  id: number;
  badge_name: string;
  min_points: number;
  max_points: number;
  description: string;
  benefits: {
    free_shipping: boolean;
    discount_percent: number;
    priority_support: boolean;
  };
  icon_url: string;
  color: string;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyRule {
  id: number;
  transaction_type: string;
  points: number;
  referee_points: number | null;
  per_amount: number | null;
  description: string;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyStatsData {
  id: number;
  user_id: number;
  available_points: number;
  used_points: number;
  total_spent: number;
  current_badge: string;
  lifetime_points: number;
  updatedAt: string;
  createdAt: string;
  badge_info: BadgeInfo[];
  loyalty_rules: LoyaltyRule[];
}

export type LoyaltyTransactionType = "earned" | "redeemed";

export interface LoyaltyTransaction {
  id: number;
  user_id: number;
  points: number;
  type: LoyaltyTransactionType;
  description?: string;
  order_id?: string;
  order_number?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyHistoryData {
  data: LoyaltyTransaction[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export const loyaltyService = emptySplitApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getLoyaltyStats: builder.query<
      CommonResponseType & { data: LoyaltyStatsData },
      void
    >({
      query: () => ({
        url: END_POINTS.getLoyaltyStats,
        method: "GET",
      }),
      providesTags: ["LOYALTY"],
    }),
    getLoyaltyHistory: builder.query<
      CommonResponseType & { data: LoyaltyHistoryData },
      { page?: number; limit?: number; type?: LoyaltyTransactionType }
    >({
      query: ({ page = 1, limit = 10, type }) => {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("limit", limit.toString());
        // Add type filter only if it's a valid ENUM value ('earned' or 'redeemed')
        if (type && (type === "earned" || type === "redeemed")) {
          params.append("type", type);
        }
        return {
          url: `${END_POINTS.getLoyaltyHistory}?${params.toString()}`,
          method: "GET",
        };
      },
      providesTags: ["LOYALTY"],
    }),
  }),
});

export const { useGetLoyaltyStatsQuery, useGetLoyaltyHistoryQuery } = loyaltyService;
