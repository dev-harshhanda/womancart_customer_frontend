"use client";
import React from "react";
import { Button } from "@mui/material";
import { useGetReferralStatsQuery, useGetReferralHistoryQuery } from "../../../../lib/rtk";
import NoDataFound from "@/components/noDataFound";
import { toast } from "react-hot-toast";

function ReferEarn() {
  const { data: referralStatsData, isLoading: isLoadingStats, isError: isErrorStats } = useGetReferralStatsQuery();
  const { data: referralHistoryData, isLoading: isLoadingHistory, isError: isErrorHistory } = useGetReferralHistoryQuery();

  const referralStats = referralStatsData?.data?.stats;
  const referralHistory = referralHistoryData?.data?.history || [];
  
  if (isErrorStats || isErrorHistory) {
    return <div>Error loading referral data.</div>;
  }

  const handleSendInvite = () => {
    // Replace with your actual referral link logic
    const referralLink = `${window.location.origin}/referral/${referralStats?.referral_code || ""}`;
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied to clipboard!");
  };

  const Shimmer = () => ( 
    <ul className="reference_lst">
      {[...Array(3)].map((_, index) => (
        <li className="reference_bx" key={index}>
          <div className="lt">
            <div className="shimmer" style={{ width: '120px', height: '16px', marginBottom: '8px' }}></div>
            <div className="shimmer" style={{ width: '180px', height: '14px' }}></div>
          </div>
          <div className="rt">
            <div className="shimmer" style={{ width: '60px', height: '16px', marginBottom: '8px' }}></div>
            <div className="shimmer" style={{ width: '100px', height: '14px' }}></div>
          </div>
        </li>
      ))}
    </ul>
  );

  const StatsShimmer = () => (
    <div className="rfer_earn_lst gap_m mb_30">
      <div className="rfer_earn_bx earned w_50">
        <div className="rfer_earncnt">
          <div className="shimmer" style={{ width: '150px', height: '16px', marginBottom: '10px', backgroundColor: 'white' }}></div>
          <div className="shimmer" style={{ width: '200px', height: '24px', backgroundColor: 'white' }}></div>
        </div>
        <figure>
          <div className="shimmer" style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'white' }}></div>
        </figure>
      </div>
      <div className="rfer_earn_bx referals w_50">
        <div className="rfer_earncnt">
          <div className="shimmer" style={{ width: '150px', height: '16px', marginBottom: '10px', backgroundColor: 'white' }}></div>
          <div className="shimmer" style={{ width: '100px', height: '24px', backgroundColor: 'white' }}></div>
        </div>
        <div className="shimmer" style={{ width: '120px', height: '36px', borderRadius: '4px', backgroundColor: 'white' }}></div>
      </div>
    </div>
  );

  return (
    <>
      <div className="rfer_earn_sc">
        <div className="s_head flex hd_6 ">
          <h2>Refer & Earn</h2>
        </div>

        {isLoadingStats ? (
          <StatsShimmer />
        ) : (
          <div className="rfer_earn_lst gap_m mb_30">
            <div className="rfer_earn_bx earned w_50">
              <div className="rfer_earncnt">
                <p>Total Reward Earned</p>
                <h3>{referralStats?.total_points_earned} Points</h3>
              </div>
              <figure>
                <img src="/images/reward.png" alt="reward image" />
              </figure>
            </div>
            <div className="rfer_earn_bx referals w_50">
              <div className="rfer_earncnt">
                <p>Total Referrals</p>
                <h3>{referralStats?.total_referrals}</h3>
              </div>
              <Button onClick={handleSendInvite}>Send Invite</Button>
            </div>
          </div>
        )}

        <div className="refrnc_hstry">
          <div className="s_head flex hd_6 border_none">
            <h2>Reference History</h2>
          </div>
          {isLoadingHistory ? (
            <Shimmer />
          ) : referralHistory.length > 0 ? (
            <ul className="reference_lst">
              {referralHistory.map((item: any, index: number) => {
                const email = item.email || item.referred_user_email || item.user_email || item.referred_email || "";
                // Format date safely
                const formatDate = (dateString: any) => {
                  if (!dateString) return "N/A";
                  try {
                    const date = new Date(dateString);
                    if (isNaN(date.getTime())) {
                      // Try parsing different date formats
                      const parsedDate = new Date(dateString.replace(/-/g, '/'));
                      if (isNaN(parsedDate.getTime())) {
                        return "N/A";
                      }
                      return parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    }
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  } catch (error) {
                    return "N/A";
                  }
                };

                const displayDate = formatDate(item.created_at || item.createdAt || item.date);

                return (
                  <li className="reference_bx" key={index}>
                    <div className="lt">
                      <p>{item.referred_user?.email || item.name || "User"}</p>
                      {/* {email && <p style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>{email}</p>} */}
                      <h3>
                        Referral Status :
                        <span className={item.status === 'successful' ? 'succesfull' : 'pending'}>
                          {item.status || 'pending'}
                        </span>
                      </h3>
                    </div>

                    <div className="rt">
                      <h3>{displayDate}</h3>
                      <p>
                        <img src="/images/refer_coin.svg" alt="" />
                        {item.points_earned > 0 ? (
                          <>You've earned <span className="c_primary">{item.points_earned} Points</span></>
                        ) : (
                          <>You've got no reward</>
                        )}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <NoDataFound message="No history found" />
          )}
        </div>
      </div>
    </>
  );
}

export default ReferEarn;
