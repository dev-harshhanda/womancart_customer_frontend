/* eslint-disable @next/next/no-img-element */
"use client";
import SemiCircleProgress from "@/components/SemiCircleProgress";
import { Box, Tab, Tabs } from "@mui/material";
import React, { useState } from "react";
import { useGetLoyaltyStatsQuery, useGetLoyaltyHistoryQuery, type LoyaltyTransactionType } from "@/service/loyalty";
import NoDataFound from "@/components/noDataFound";
import CustomPagination from "@/components/customPagination";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

function LoyaltyProgram() {
  const [] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [value, setValue] = React.useState(0);
  const [imageError, setImageError] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const limit = 10;

  const { data: loyaltyData, isLoading, isError } = useGetLoyaltyStatsQuery();
  
  const loyaltyStats = loyaltyData?.data;
  const badgeInfo = loyaltyStats?.badge_info || [];
  const currentBadge = loyaltyStats?.current_badge || "";
  const availablePoints = loyaltyStats?.available_points || 0;
  const lifetimePoints = loyaltyStats?.lifetime_points || 0;
  const earningRules =
    (loyaltyStats as any)?.loyalty_rules ||
    (loyaltyStats as any)?.earning_rules ||
    (loyaltyStats as any)?.rules ||
    [];

  // Determine transaction type filter based on selected tab
  // Type must be ENUM: 'earned' | 'redeemed'
  const getTransactionType = (): LoyaltyTransactionType | undefined => {
    if (value === 1) return "earned"; // Rewards tab - filter by 'earned'
    if (value === 2) return "redeemed"; // Redeemed tab - filter by 'redeemed'
    return undefined; // All Transactions - no type filter
  };

  const transactionType = getTransactionType();
  
  const { 
    data: historyData, 
    isLoading: isHistoryLoading, 
    isFetching: isHistoryFetching,
    isError: isHistoryError 
  } = useGetLoyaltyHistoryQuery({ 
    page: currentPage, 
    limit, 
    type: transactionType 
  }, {
    // Refetch when tab changes (type changes)
    refetchOnMountOrArgChange: true,
  });

  const transactions = historyData?.data?.data || [];
  const pagination = historyData?.data?.pagination || { total: 0, page: 1, limit: 10, pages: 0 };
  const totalPages = pagination.pages || Math.ceil((pagination.total || 0) / limit) || 1;

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Scroll to top of transaction list when page changes
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Find current badge icon URL
  const currentBadgeData = badgeInfo.find(
    (badge) => badge.badge_name.toLowerCase() === currentBadge.toLowerCase()
  );
  const badgeIconUrlFromApi = currentBadgeData?.icon_url || "";
  
  // Get badge-specific fallback icon based on badge name
  const getBadgeFallbackIcon = (badgeName: string): string => {
    const badgeLower = badgeName.toLowerCase();
    // Try badge-specific icons first, then generic fallback
    if (badgeLower.includes('gold')) {
      return "/images/earn.png"; // Gold badge fallback
    } else if (badgeLower.includes('silver')) {
      return "/images/earn.png"; // Silver badge fallback
    } else if (badgeLower.includes('bronze')) {
      return "/images/earn.png"; // Bronze badge fallback
    }
    return "/images/earn.png"; // Generic fallback
  };
  
  const fallbackIconUrl = getBadgeFallbackIcon(currentBadge);
  
  // Check if URL is dummy/placeholder or invalid
  const isDummyUrl = (url: string) => {
    if (!url) return true;
    const dummyPatterns = [
      'placeholder',
      'dummy',
      'example.com',
      'cdn.yourapp.com', // Common placeholder domain
      'your-image-url',
      'image-url-here',
      'http://', // Incomplete URLs
      'https://', // Incomplete URLs without domain
    ];
    const urlLower = url.toLowerCase();
    // Check if URL is just a protocol or contains dummy patterns
    if (urlLower === 'http://' || urlLower === 'https://') return true;
    return dummyPatterns.some(pattern => urlLower.includes(pattern));
  };
  
  // Validate URL format
  const isValidUrl = (url: string): boolean => {
    if (!url) return false;
    try {
      // Check if it's a relative path (starts with /)
      if (url.startsWith('/')) return true;
      // Check if it's a valid absolute URL
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };
  
  const badgeIconUrl = (badgeIconUrlFromApi && 
                        !isDummyUrl(badgeIconUrlFromApi) && 
                        isValidUrl(badgeIconUrlFromApi)) 
    ? badgeIconUrlFromApi 
    : fallbackIconUrl;
  
  // Reset image error when badge changes
  React.useEffect(() => {
    setImageError(false);
  }, [badgeIconUrl]);

  // Capitalize first letter of badge name
  const getBadgeDisplayName = (badgeName: string) => {
    return badgeName.charAt(0).toUpperCase() + badgeName.slice(1);
  };

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
    setCurrentPage(1); // Reset to first page when changing tabs
    // Scroll to top when changing tabs
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Format transaction date
  const formatTransactionDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  // Format transaction description
  const formatTransactionDescription = (transaction: any) => {
    if (transaction?.description) {
      return transaction.description;
    }
    if (transaction?.order_number) {
      return `Order #${transaction.order_number}`;
    }
    if (transaction?.order_id) {
      return `Order #${transaction.order_id}`;
    }
    return "Transaction";
  };

  // Get transaction type label
  const getTransactionTypeLabel = (type?: string) => {
    const normalized = (type || "").toLowerCase();
    if (normalized === "earned" || normalized === "reward") return "Earned";
    if (normalized === "redeemed") return "Redeemed";
    return type || "Transaction";
  };

  // Render transaction list with pagination
  const renderTransactionList = () => {
    // Show shimmer when loading or fetching (including when switching tabs)
    if (isHistoryLoading || isHistoryFetching) {
      return (
        <>
          <ul className="trnsactn_hstry_lst">
            {Array.from({ length: 5 }).map((_, index) => (
              <li className="trnsactn_hstry_bx" key={index}>
                <p>
                  <span className="shimmer" style={{ width: '80px', height: '16px', display: 'inline-block', marginRight: '8px' }}></span>
                  <span className="shimmer" style={{ width: '200px', height: '16px', display: 'inline-block' }}></span>
                </p>
                <div className="rt">
                  <span className="shimmer" style={{ width: '60px', height: '16px', display: 'block', marginBottom: '8px' }}></span>
                  <span className="shimmer" style={{ width: '100px', height: '14px', display: 'block' }}></span>
                </div>
              </li>
            ))}
          </ul>
        </>
      );
    }

    if (isHistoryError || !transactions.length) {
      return <NoDataFound message="No transactions found" />;
    }

    return (
      <>
        <ul className="trnsactn_hstry_lst">
          {transactions.map((transaction: any) => {
            const type = transaction?.type || "";
            const isEarned = type.toLowerCase() === "earned" || type.toLowerCase() === "reward";
            const points = Math.abs(transaction?.points || 0);
            const pointsDisplay = `${isEarned ? "+" : "-"} ${points} Points`;
            const statusClass = isEarned ? "completed" : "pending";

            return (
              // eslint-disable-next-line sonarjs/no-duplicate-string
              <li className="trnsactn_hstry_bx" key={transaction?.id || Math.random()}>  
                <p>
                  <span className="c_primary">{getTransactionTypeLabel(type)}</span>
                  {formatTransactionDescription(transaction)}
                </p>
                <div className="rt">
                  <h3>{formatTransactionDate(transaction?.createdAt || transaction?.created_at)}</h3>
                  <p className={statusClass}>{pointsDisplay}</p>
                </div>
              </li>
            );
          })}
        </ul>
        {/* Pagination Controls - Show only when total items > 10 and multiple pages */}
        {(pagination.total || 0) > 10 && totalPages > 1 && (
          <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center' }}>
            <CustomPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </>
    );
  };

  if (isError) {
    return (
      <div className="rfer_earn_sc">
        <div className="s_head flex hd_6 ">
          <h2>Loyalty Program</h2>
        </div>
        <NoDataFound message="Error loading loyalty data. Please try again later." />
      </div>
    );
  }

  return (
    <>
      <div className="rfer_earn_sc">
        <div className="s_head flex hd_6 ">
          <h2>Loyalty Program</h2>
        </div>

        <div className="rfer_earn_lst gap_m mb_30">
          {isLoading ? (
            <div className="rfer_earn_bx earned w_100">
              <div className="rfer_earncnt">
                <div className="shimmer" style={{ width: '150px', height: '16px', marginBottom: '10px', backgroundColor: 'white' }}></div>
                <div className="shimmer" style={{ width: '200px', height: '24px', backgroundColor: 'white' }}></div>
              </div>
              <figure>
                <div className="shimmer" style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'white' }}></div>
              </figure>
            </div>
          ) : (
            <div className="rfer_earn_bx earned w_100">
              <div className="rfer_earncnt">
                <p>Available Balance</p>
                <h3>{availablePoints} Points</h3>
              </div>
              <figure>
                <img src="/images/reward.png" alt="reward image" />
              </figure>
            </div>
          )}
        </div>

        <div className="loyalty_prgrm_mn gap_m">
          <div className="lt w_50">
            <div className="s_head flex hd_6 border_none">
              <h2>Transaction History</h2>
              <div className="rt w_50">
                <Tabs
                  value={value}
                  onChange={handleChange}
                  aria-label="basic tabs example"
                  className="site_tabs3"
                >
                  <Tab label="All Transactions" {...a11yProps(0)} />
                  <Tab label="Rewards" {...a11yProps(1)} />
                  <Tab label="Redeemed" {...a11yProps(2)} />
                </Tabs>
              </div>
            </div>

            <CustomTabPanel value={value} index={0}>
              {renderTransactionList()}
            </CustomTabPanel>

            <CustomTabPanel value={value} index={1}>
              {renderTransactionList()}
            </CustomTabPanel>

            <CustomTabPanel value={value} index={2}>
              {renderTransactionList()}
            </CustomTabPanel>
          </div>
          <div className="rt w_50">
            {isLoading ? (
              <>
                <div className="earned_points mb_30">
                  <div className="shimmer" style={{ width: '100%', height: '200px', borderRadius: '8px' }}></div>
                </div>
                <div className="level mb_30">
                  <div className="lt">
                    <div className="shimmer" style={{ width: '100px', height: '16px', marginBottom: '10px' }}></div>
                    <div className="shimmer" style={{ width: '150px', height: '24px' }}></div>
                  </div>
                  <figure>
                    <div className="shimmer" style={{ width: '60px', height: '60px', borderRadius: '8px' }}></div>
                  </figure>
                </div>
              </>
            ) : (
              <>
                <div className="earned_points mb_30">
                  <SemiCircleProgress 
                    pointsEarned={lifetimePoints}
                    currentBadge={currentBadge}
                    badgeInfo={badgeInfo}
                  />
                </div>
                <div className={`level mb_30 ${currentBadge ? `badge-${currentBadge.toLowerCase()}` : ''}`}>
                  <div className="lt">
                    <p>Your Level</p>
                    <h3>{getBadgeDisplayName(currentBadge)}</h3>
                  </div>
                  <figure>
                    <img 
                      src={imageError ? fallbackIconUrl : currentBadge === 'gold'? '/images/loyality_01.svg': currentBadge === 'bronze'? '/images/loyality_02.svg': currentBadge === 'silver'? '/images/loyality_03.svg': badgeIconUrl} 
                      alt={currentBadge}
                      onError={() => setImageError(true)}
                      className={currentBadge?.toLowerCase().includes('gold') ? 'gold-badge-icon' : ''}
                      style={currentBadgeData?.color && currentBadge?.toLowerCase().includes('gold') ? {
                        filter: `drop-shadow(0 0 8px ${currentBadgeData.color}) brightness(1.2) saturate(1.3)`
                      } : undefined}
                    />
                  </figure>
                </div>
              </>
            )}
            <div className="hwto_earn mb_30">
              <h3>How you Earn Point</h3>
              {earningRules && earningRules.length > 0 ? (
                <ul>
                  {earningRules.map((rule: any) => {
                    const rawType = (rule.transaction_type || "").toString();
                    const formattedType =
                      rawType.charAt(0).toUpperCase() + rawType.slice(1);
                    return (
                      <li key={rule.id || rule.transaction_type}>
                        {formattedType} : {rule.description}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <ul>
                  <li>Purchases: 1 point per ₹100 spent. </li>
                  <li>Referrals: 100 points for referring a friend. </li>
                  <li>On Sign-up: New users get bonus points for joining</li>
                </ul>
              )}
            </div>
            <div className="hwto_earn">
              <h3>How you Earn Badge</h3>
              {isLoading ? (
                <ul>
                  <li>
                    <div className="shimmer" style={{ width: '200px', height: '16px', marginBottom: '8px' }}></div>
                  </li>
                  <li>
                    <div className="shimmer" style={{ width: '200px', height: '16px', marginBottom: '8px' }}></div>
                  </li>
                  <li>
                    <div className="shimmer" style={{ width: '200px', height: '16px' }}></div>
                  </li>
                </ul>
              ) : badgeInfo.length > 0 ? (
                <ul>
                  {badgeInfo.map((badge, index) => (
                    <li key={index}>
                      {getBadgeDisplayName(badge.badge_name)}: {badge.min_points}–{badge.max_points} points
                    </li>
                  ))}
                </ul>
              ) : (
                <ul>
                  <li>Bronze: 0–499 points</li>
                  <li>Silver: 500–999 points</li>
                  <li>Gold: 1000–2499 points</li>
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default LoyaltyProgram;
