"use client"
import SwitchToggle from "@/components/SwitchToggle";
import { IconButton, Skeleton } from "@mui/material";
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useUpdatePreferencesMutation } from "@/service/preferences";
import { useGetProfileQuery } from "@/service/auth";
import { toast } from "react-hot-toast";

const notificationSections = [
  {
    title: "Communication Settings",
    options: [
      { label: "Email", key: "email_notification" },
      { label: "SMS", key: "sms_notification" },
      { label: "Push Notifications", key: "push_notification" },
    ],
  },
  {
    title: "Content Settings",
    options: [
      { label: "Offers & Promotions", key: "offers_promotion" },
      { label: "Order Updates", key: "order_update" },
      { label: "Personalized Recommendations", key: "personalized_recommendations" },
    ],
  },
  {
    title: "Offer Settings",
    options: [
      { label: "Daily Deals Alerts", key: "daily_deals" },
      { label: "Specific Offers", key: "specific_offers" },
    ],
  },
];

function NotificationSetting() {
  const router = useRouter();
  const { data: profileResponse, isLoading } = useGetProfileQuery();
  const [updatePreferences] = useUpdatePreferencesMutation();
  const [preferences, setPreferences] = useState<any>({
    email_notification: 0,
    sms_notification: 0,
    push_notification: 0,
    offers_promotion: 0,
    order_update: 0,
    personalized_recommendations: 0,
    daily_deals: 0,
    specific_offers: 0,
  });

  useEffect(() => {
    if (profileResponse?.data) {
      const data = profileResponse.data;
      setPreferences({
        email_notification: data.email_notification ? 1 : 0,
        sms_notification: data.sms_notification ? 1 : 0,
        push_notification: data.push_notification ? 1 : 0,
        offers_promotion: data.offers_promotion ? 1 : 0,
        order_update: data.order_update ? 1 : 0,
        personalized_recommendations: data.personalized_recommendations ? 1 : 0,
        daily_deals: data.daily_deals ? 1 : 0,
        specific_offers: data.specific_offers ? 1 : 0,
      });
    }
  }, [profileResponse]);

  const handleToggle = async (key: string, checked: boolean) => {
    const newVal = checked ? 1 : 0;
    const updatedPrefs = { ...preferences, [key]: newVal };

    // Optimistic update
    setPreferences(updatedPrefs);

    try {
      const formData = new FormData();
      // Ensure all 8 fields are sent every time as per curl
      Object.keys(updatedPrefs).forEach(k => {
        formData.append(k, updatedPrefs[k].toString());
      });

      const res = await updatePreferences({ body: formData }).unwrap();
      if (res.statusCode === 200) {
        toast.success(res.message || "Preferences updated successfully");
      }
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to update preferences");
      // Rollback on error
      if (profileResponse?.data) {
        const data = profileResponse.data;
        setPreferences({
          email_notification: data.email_notification ? 1 : 0,
          sms_notification: data.sms_notification ? 1 : 0,
          push_notification: data.push_notification ? 1 : 0,
          offers_promotion: data.offers_promotion ? 1 : 0,
          order_update: data.order_update ? 1 : 0,
          personalized_recommendations: data.personalized_recommendations ? 1 : 0,
          daily_deals: data.daily_deals ? 1 : 0,
          specific_offers: data.specific_offers ? 1 : 0,
        });
      }
    }
  };

  return (
    <>
      <div className="s_head flex hd_6 border_none justify-between items-center relative">
        <IconButton
          onClick={() => router.back()}
          className="absolute left-0"
          sx={{ color: '#000' }}
        >
          <ArrowBackIosIcon sx={{ fontSize: '18px' }} />
        </IconButton>
        <h2 className="w-full text-center">Preferences</h2>
      </div>

      <div className="notification_container">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <div className="notification_bx" key={idx}>
              <div className="hd_5">
                <Skeleton width="40%" height={30} />
              </div>
              <ul className="notification_list">
                {Array.from({ length: 3 }).map((_, i) => (
                  <li key={i}>
                    <div className="flex justify-between items-center w-full">
                      <Skeleton width="30%" height={24} />
                      <Skeleton variant="rectangular" width={46} height={24} style={{ borderRadius: 12 }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          notificationSections.map((section, idx) => (
            <div className="notification_bx" key={idx}>
              <div className="hd_5">
                <h3>{section.title}</h3>
              </div>
              <ul className="notification_list">
                {section.options.map((opt, i) => (
                  <li key={i}>
                    <SwitchToggle
                      label={opt.label}
                      checked={!!preferences[opt.key]}
                      onChange={(e, checked) => handleToggle(opt.key, checked)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </>
  );
}

export default NotificationSetting;
