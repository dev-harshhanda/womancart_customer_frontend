/* eslint-disable @next/next/no-img-element */
"use client";
import React, { useEffect, useState, MouseEvent } from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import AddIcon from "@mui/icons-material/Add";
import { Button, IconButton } from "@mui/material";
import TopUp from "@/modal/topup";
import { useGetWalletBalanceQuery, useGetWalletHistoryQuery } from "@/service/wallet";
import NoDataFound from "@/components/noDataFound";
import { formatPriceInr } from "@/utils/format";

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

function MyWallet() {
  const [value, setValue] = React.useState(0);
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };
  const [open1, setOpen1] = useState(false);
  const handleCloseModal1 = () => {
    setOpen1(false);
  };
  const { data: walletBalanceData, refetch: refetchWalletBalance } =
    useGetWalletBalanceQuery();
  const historyType =
    value === 1
      ? "top_up"
      : value === 2
      ? "purchase"
      : value === 3
      ? "reward"
      : value === 4
      ? "refund"
      : undefined;
  const { data: walletHistoryData, isFetching: isHistoryLoading } =
    useGetWalletHistoryQuery({ type: historyType });
  const [lastUpdated, setLastUpdated] = useState("");

  const balanceValue = walletBalanceData?.data?.wallet?.balance;
  const balanceNumber = Number(balanceValue);
  const formattedBalance = Number.isFinite(balanceNumber)
    ? formatPriceInr(balanceNumber)
    : "0.00";

  useEffect(() => {
    if (walletBalanceData?.data?.wallet?.balance !== undefined) {
      setLastUpdated(new Date().toLocaleString());
    }
  }, [walletBalanceData]);

  const transactions = walletHistoryData?.data?.transactions || [];

  const formatTransactionDate = (value?: string) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getTransactionLabel = (type?: string) => {
    const normalized = (type || "").toLowerCase();
    if (normalized === "top_up") return "Top Up";
    if (normalized === "purchase") return "Purchase";
    if (normalized === "rewards" || normalized === "reward") return "Rewards";
    if (normalized === "refund" || normalized === "refunds") return "Refund";
    return "Transaction";
  };

  const formatTransactionAmount = (amount: string | number, type?: string) => {
    const numericAmount = Number(amount);
    const formatted = Number.isFinite(numericAmount)
      ? formatPriceInr(numericAmount)
      : "0.00";
    const normalized = (type || "").toLowerCase();
    const sign = normalized === "purchase" ? "-" : "+";
    return `${sign} ₹${formatted}`;
  };

  const renderHistoryList = () => {
    if (isHistoryLoading) {
      return (
        <ul className="trnsactn_hstry_lst">
          {Array.from({ length: 6 }).map((_, index) => (
            <li
              className="trnsactn_hstry_bx transaction_skeleton_item"
              key={index}
            >
              <p>
                <span className="skeleton_shimmer skeleton_label" />
                <span className="skeleton_shimmer skeleton_text" />
              </p>
              <div className="rt">
                <span className="skeleton_shimmer skeleton_date" />
                <span className="skeleton_shimmer skeleton_amount" />
              </div>
            </li>
          ))}
        </ul>
      );
    }

    if (!transactions.length) {
      return <NoDataFound message="No transactions found" />;
    }

    return (
      <ul className="trnsactn_hstry_lst">
        {transactions.map((transaction: any) => {
          const label = getTransactionLabel(transaction?.type);
          const description =
            transaction?.description || `${label} #${transaction?.id || ""}`;
          const createdAt =
            transaction?.created_at || transaction?.createdAt || "";
          const statusClass =
            transaction?.status === "completed" ? "completed" : "pending";
          return (
            <li className="trnsactn_hstry_bx" key={transaction?.id}>
              <p>
                <span className="c_primary">{label}</span>
                {description}
              </p>
              <div className="rt">
                <h3>{formatTransactionDate(createdAt)}</h3>
                <p className={statusClass}>
                  {formatTransactionAmount(
                    transaction?.amount,
                    transaction?.type
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  const [showBalance, setShowBalance] = useState(true);
  const handleClickShowBalance = () => {
    setShowBalance((prev) => !prev);
  };
  const handleMouseDownBalance = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };
  const handleMouseUpBalance = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  return (
    <>
      <div className="s_head flex hd_6">
        <h2>My Wallet</h2>
      </div>

      <div className="wallet_cta_sc text_white mb_30">
        <div className="wallet_cta_lt form">
          <h3>Total Balance</h3>
          <p className="balance" style={{ color: "#ffffff" }}>
            {showBalance ? (
              <span className="dots">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </span>
            ) : (
              `₹${formattedBalance}`
            )}

            <IconButton
              aria-label={showBalance ? "hide balance" : "show balance"}
              onClick={handleClickShowBalance}
              onMouseDown={handleMouseDownBalance}
              onMouseUp={handleMouseUpBalance}
            >
              {showBalance ? (
                <img src="/images/eye_hide.svg" alt="Icon" />
              ) : (
                <img src="/images/eye_visible.svg" alt="Icon" />
              )}
            </IconButton>
          </p>
          <p>Updated : {lastUpdated || "—"}</p>
        </div>
        {/* <div className="wallet_cta_rt">
          <Button 
          // onClick={() => 
          //   setOpen1(true)
          //   }
            >
            Top Up <AddIcon />
          </Button>
        </div> */}
      </div>

      <div className="transaction_history s_head flex hd_6 border_none">
        <h2>Transaction History</h2>
        <div className="rt w_50">
          <Tabs
            value={value}
            onChange={handleChange}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="scrollable tabs"
            className="site_tabs3"
          >
            <Tab label="All Transactions" {...a11yProps(0)} />
            <Tab label="Top Up" {...a11yProps(1)} />
            <Tab label="Purchase" {...a11yProps(2)} />
            <Tab label="Rewards" {...a11yProps(3)} />
            <Tab label="Refunds" {...a11yProps(4)} />
          </Tabs>
        </div>
      </div>

      <CustomTabPanel value={value} index={0}>
        {renderHistoryList()}
      </CustomTabPanel>

      <CustomTabPanel value={value} index={1}>
        {renderHistoryList()}
      </CustomTabPanel>

      <CustomTabPanel value={value} index={2}>
        {renderHistoryList()}
      </CustomTabPanel>

      <CustomTabPanel value={value} index={3}>
        {renderHistoryList()}
      </CustomTabPanel>

      <CustomTabPanel value={value} index={4}>
        {renderHistoryList()}
      </CustomTabPanel>
      <TopUp
        open={open1}
        onClose={handleCloseModal1}
        setOpen={setOpen1}
        onTopUpSuccess={refetchWalletBalance}
      />
    </>
  );
}

export default MyWallet;
