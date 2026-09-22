/* eslint-disable @next/next/no-img-element */
"use client";

import BredCrum from "@/components/bredCrum";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";
import EastIcon from "@mui/icons-material/East";
import MenuIcon from "@mui/icons-material/Menu";
import { IconButton } from "@mui/material";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hook";
import { resetAuth, setToken } from "@/lib/slices/authSlice";
import { removeFromStorage, getFromStorage } from "@/constants/storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import { clearAllPersistedCartCoupons } from "@/utils/cartCouponStorage";
import { API_URL, END_POINTS } from "@/constants/url";
import toast from "react-hot-toast";
import { useGetProfileQuery, useDeleteAccountMutation } from "@/service/auth";
import ConfirmModal from "@/modal/confirmModal";

const items = [
  { label: "Home", path: "/" },
  { label: "My Account", path: "/account/profile/" },
];
const menuItems = [
  { label: "My Orders", path: "/account/orders" },
  // { label: "Payment Cards", path: "/account/payment-list" },
  { label: "Delivery Addresses", path: "/account/my-address/" },
  { label: "Wishlist", path: "/wishlist" },
  // { label: "Change Password", path: "/account/change-password" },
  { label: "My Wallet", path: "/account/my-wallet" },
  // { label: "Blogs", path: "/account/blogs" },
  { label: "Preferences", path: "/account/notification-settings" },
  { label: "Loyalty Points", path: "/account/loyalty-program" },
  { label: "Refer & Earn", path: "/account/refer-and-earn" },
  { label: "Help & Support", path: "/account/help-center" },
];
const menuItems2 = [
  { label: "About Us", path: "/about-us" },
  { label: "Terms & Conditions", path: "/terms-conditions" },
  { label: "Return & Refund Policy", path: "/refund-return-policy" },
  { label: "FAQs", path: "/faqs" },
  { label: "Delete Account" },
  { label: "Logout" },
];

/** Account routes reachable from the footer as a guest — hide My Account sidebar only for these when not logged in. */
const GUEST_PUBLIC_ACCOUNT_PATHS = [
  "/account/help-center",
  "/account/careers",
  "/account/feedback",
  "/account/contact-us",
] as const;

const GUEST_PUBLIC_BREADCRUMB: Record<string, string> = {
  "/account/help-center": "Help & Support",
  "/account/careers": "Careers",
  "/account/feedback": "Feedback",
  "/account/contact-us": "Contact Us",
};

export default function AccountLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  // eslint-disable-next-line sonarjs/no-duplicate-string
  const normalize = (str: string) => str.replace(/\/+$/, "");
  const [isActive, setIsActive] = useState(false);
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.token);
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const fcmToken = useAppSelector((state) => state.auth.fcmToken);

  // Avoid calling getProfile for guests — a 401 triggers global redirect to login (see lib/rtk.ts).
  const hasAuthToken = Boolean(
    token ||
    (typeof window !== "undefined" && getFromStorage(STORAGE_KEYS.token)),
  );

  const { data: profileResponse, refetch } = useGetProfileQuery(undefined, {
    skip: !hasAuthToken,
  });

  // Delete account mutation
  const [deleteAccount, { isLoading: isDeletingAccount }] = useDeleteAccountMutation();

  // Logout confirmation modal state
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Delete account confirmation modal state
  const [deleteAccountConfirmOpen, setDeleteAccountConfirmOpen] = useState(false);
  const [avatarImageFailed, setAvatarImageFailed] = useState(false);

  // Get user data from storage or API
  const [userData, setUserData] = useState<{
    name?: string;
    email?: string;
    avatar?: string;
  }>({});
  const resolvedUserName = String(userData?.name || "").trim();
  const accountDisplayName = resolvedUserName || (hasAuthToken ? "User" : "Sign Up");

  const syncAuthFromStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    const stored = getFromStorage(STORAGE_KEYS.token);
    if (!stored) {
      if (tokenRef.current) dispatch(resetAuth());
    } else if (stored !== tokenRef.current) {
      dispatch(setToken({ token: stored }));
    }
  }, [dispatch]);

  const applyUserDataFromProfileOrStorage = useCallback(() => {
    if (profileResponse?.data) {
      const data = profileResponse.data;
      setUserData({
        name: data?.name || data?.fullName || "",
        email: data?.email || "",
        avatar: data?.avatar || data?.image || "",
      });
      return;
    }

    const credentialsStr = getFromStorage(STORAGE_KEYS.credentials);
    if (credentialsStr) {
      try {
        const credentials = JSON.parse(credentialsStr);
        setUserData({
          name: credentials?.name || credentials?.fullName || "",
          email: credentials?.email || "",
          avatar: credentials?.avatar || credentials?.image || "",
        });
      } catch (error) {
        console.error("Error parsing credentials:", error);
      }
    } else {
      setUserData({});
    }
  }, [profileResponse]);

  useEffect(() => {
    applyUserDataFromProfileOrStorage();
  }, [applyUserDataFromProfileOrStorage]);

  useEffect(() => {
    setAvatarImageFailed(false);
  }, [userData?.avatar]);

  useEffect(() => {
    syncAuthFromStorage();
  }, [syncAuthFromStorage]);

  useEffect(() => {
    const authStorageKeys = new Set([
      STORAGE_KEYS.token,
      STORAGE_KEYS.tokenNode,
      STORAGE_KEYS.credentials,
    ]);

    const handleAuthStorage = (e: StorageEvent) => {
      if (e.key !== null && !authStorageKeys.has(e.key)) return;

      syncAuthFromStorage();
      const authed = Boolean(getFromStorage(STORAGE_KEYS.token));
      if (authed) {
        void refetch();
      } else {
        setUserData({});
      }
    };

    const handleProfileUpdate = () => {
      syncAuthFromStorage();
      if (getFromStorage(STORAGE_KEYS.token)) void refetch();
    };

    const handleFocus = () => {
      syncAuthFromStorage();
      applyUserDataFromProfileOrStorage();
    };

    window.addEventListener("storage", handleAuthStorage);
    window.addEventListener("profileUpdated", handleProfileUpdate);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("storage", handleAuthStorage);
      window.removeEventListener("profileUpdated", handleProfileUpdate);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refetch, syncAuthFromStorage, applyUserDataFromProfileOrStorage]);

  const handleClick = () => {
    setIsActive((prev) => !prev);
  };

  const handleDeleteAccountClick = () => {
    setDeleteAccountConfirmOpen(true);
  };

  const handleDeleteAccountCancel = () => {
    setDeleteAccountConfirmOpen(false);
  };

  const handleDeleteAccountConfirm = async () => {
    try {
      // Call delete account API
      const result: any = await deleteAccount().unwrap();

      // Show success message
      toast.success(result?.message || "Account deleted successfully");

      // Clear all storage
      removeFromStorage(STORAGE_KEYS.token);
      removeFromStorage(STORAGE_KEYS.credentials);
      removeFromStorage(STORAGE_KEYS.tempUser);

      // Clear Redux auth state
      dispatch(resetAuth());

      // Clear persisted Redux state
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEYS.PERSIST);
      }

      // Close menu
      setIsActive(false);

      // Close modal
      setDeleteAccountConfirmOpen(false);

      // Redirect to login page with full reload so header + categories initialize cleanly
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login";
      } else {
        router.push("/auth/login");
      }
    } catch (error: any) {
      console.error("Error deleting account:", error);
      const errorMessage =
        error?.data?.message ||
        error?.message ||
        "Failed to delete account. Please try again.";
      toast.error(errorMessage);
      setDeleteAccountConfirmOpen(false);
    }
  };

  const handleLogoutClick = () => {
    setLogoutConfirmOpen(true);
  };

  const handleLogoutCancel = () => {
    setLogoutConfirmOpen(false);
  };

  const matchedGuestPath = GUEST_PUBLIC_ACCOUNT_PATHS.find(
    (p) => normalize(pathname) === normalize(p),
  );
  const hideAccountSidebar = !hasAuthToken && Boolean(matchedGuestPath);

  const breadcrumbItems =
    hideAccountSidebar && matchedGuestPath
      ? [
          { label: "Home", path: "/" },
          {
            label: GUEST_PUBLIC_BREADCRUMB[matchedGuestPath] ?? "Support",
            path: matchedGuestPath,
          },
        ]
      : items;

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);

    try {
      // Get user data from storage to build query parameters
      const credentialsStr = getFromStorage(STORAGE_KEYS.credentials);
      let userData: any = null;

      if (credentialsStr) {
        try {
          userData = JSON.parse(credentialsStr);
        } catch (error) {
          console.error("Error parsing credentials:", error);
        }
      }

      // Prepare query parameters
      const queryParams = new URLSearchParams();
      if (userData) {
        if (userData.name) queryParams.append("name", userData.name);
        if (userData.gender) queryParams.append("gender", userData.gender);
        if (userData.dob) queryParams.append("dob", userData.dob);
      }

      // Build the full URL
      const queryString = queryParams.toString();
      const logoutUrl = `${API_URL}${END_POINTS.logout}${queryString ? `?${queryString}` : ""}`;

      // Try to call logout API with GET method using direct fetch
      if (token) {
        try {
          const response = await fetch(logoutUrl, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
              "x-portal": "USER",
              "x-device-token": fcmToken || "web",
              "deviceType": "web",
            },
          });

          if (!response.ok) {
            console.warn("Logout API call returned non-OK status:", response.status);
          }
        } catch (apiError: any) {
          // Log the error but continue with local cleanup
          console.warn("Logout API call failed:", apiError);
        }
      }

      // Clear all storage regardless of API call result
      removeFromStorage(STORAGE_KEYS.token);
      removeFromStorage(STORAGE_KEYS.tokenNode);
      removeFromStorage(STORAGE_KEYS.credentials);
      removeFromStorage(STORAGE_KEYS.tempUser);
      clearAllPersistedCartCoupons();

      // Clear Redux auth state
      dispatch(resetAuth());

      // Clear persisted Redux state
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEYS.PERSIST);
      }

      toast.success("Logged out successfully");

      // Redirect to login page with full reload so guest header (categories, etc.) re-initializes
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login";
      } else {
        router.push("/auth/login");
      }
      setIsActive(false);
    } catch (error: any) {
      // Fallback: clear everything even if something unexpected happens
      removeFromStorage(STORAGE_KEYS.token);
      removeFromStorage(STORAGE_KEYS.credentials);
      removeFromStorage(STORAGE_KEYS.tempUser);
      clearAllPersistedCartCoupons();
      dispatch(resetAuth());

      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEYS.PERSIST);
      }

      toast.success("Logged out successfully");
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login";
      } else {
        router.push("/auth/login");
      }
      setIsActive(false);
    } finally {
      setIsLoggingOut(false);
      setLogoutConfirmOpen(false);
    }
  };
  return (
    <section className="account_sc u_spc">
      <div className="container">
        <BredCrum items={breadcrumbItems} />
        <div
          className={`account_grid${hideAccountSidebar ? " account_grid--guest-public" : ""}`}
        >
          {!hideAccountSidebar ? (
          <div className="lt">
            <div className="user_detail whiteBox cursor_pointer">
              <a
                className="emptyLink"
                onClick={() => router.push("/account/profile")}
              ></a>
              <figure>
                {userData?.avatar &&
                userData.avatar.startsWith("http") &&
                !avatarImageFailed ? (
                  <img
                    key={userData.avatar}
                    src={userData.avatar}
                    alt=""
                    onError={() => setAvatarImageFailed(true)}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: "50%",
                    }}
                  />
                ) : (
                  <AccountCircleOutlinedIcon
                    aria-hidden
                    sx={{
                      display: "block",
                      width: "100%",
                      height: "100%",
                      color: "#000000",
                    }}
                  />
                )}
              </figure>
              <div className="user_cnt hd_6">
                <h2>{accountDisplayName}</h2>
                <span>{userData?.email || ""}</span>
              </div>
              <ArrowOutwardIcon />
              <IconButton onClick={handleClick} className="humb_menu">
                <MenuIcon />
              </IconButton>
            </div>
            <h2>My Account</h2>
            <div className={`dropdown_menu ${isActive ? "open" : ""}`}>
              <ul className="whiteBox menu_list">
                {menuItems.map((item, index) => (
                  <li
                    key={index}
                    onClick={() => {
                      router.push(item.path);
                      setIsActive(false);
                    }}
                    className={
                      normalize(pathname) === normalize(item.path || "")
                        ? "active"
                        : ""
                    }
                  >
                    <span>{item.label}</span>
                    <EastIcon />
                  </li>
                ))}
              </ul>
              <ul className="whiteBox menu_list menu_list2">
                {menuItems2.map((item, index) => {
                  return (
                    <li
                      key={index}
                      onClick={() => {
                        if (item.label === "Logout") {
                          handleLogoutClick();
                        } else if (item.label === "Delete Account") {
                          handleDeleteAccountClick();
                        } else if (item.path) {
                          router.push(item.path);
                          setIsActive(false);
                        }
                      }}
                      className={
                        normalize(pathname) === normalize(item.path || "")
                          ? "active"
                          : ""
                      }
                      style={{
                        cursor: "pointer",
                        opacity: (item.label === "Delete Account" && isDeletingAccount) ? 0.6 : 1,
                      }}
                    >
                      <span>{item.label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          ) : null}
          <div className="account_rt">{children}</div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        open={logoutConfirmOpen}
        onClose={handleLogoutCancel}
        setOpen={setLogoutConfirmOpen}
        title="Are you sure you want to logout?"
        confirmText="Logout"
        cancelText="Cancel"
        onConfirm={handleLogoutConfirm}
        isLoading={isLoggingOut}
      />

      {/* Delete Account Confirmation Modal */}
      <ConfirmModal
        open={deleteAccountConfirmOpen}
        onClose={handleDeleteAccountCancel}
        setOpen={setDeleteAccountConfirmOpen}
        title="Are you sure you want to delete your account?"
        description="This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteAccountConfirm}
        isLoading={isDeletingAccount}
      />
    </section>
  );
}