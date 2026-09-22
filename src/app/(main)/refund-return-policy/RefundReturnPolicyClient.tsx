"use client";
import React from "react";
import BredCrum from "@/components/bredCrum";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import { useGetRefundPolicyQuery, useGetReturnPolicyQuery } from "@/service/cms";
import { extractPolicyContent } from "@/utils/cmsContent";
import Skeleton from "@mui/material/Skeleton";

const items = [{ label: "Home", path: "/" }, { label: "Return & Refund Policy" }];

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

function RefundReturnPolicyPage() {
  const [value, setValue] = React.useState(0);
  const { data: returnPolicy, isLoading: isReturnLoading, isError: isReturnError } = useGetReturnPolicyQuery();
  const { data: refundPolicy, isLoading: isRefundLoading, isError: isRefundError } = useGetRefundPolicyQuery();

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const renderContent = (data: string | undefined, isLoading: boolean, isError: boolean) => {
    if (isLoading) {
      return (
        <Box sx={{ p: 3 }}>
          <Skeleton variant="text" sx={{ fontSize: "1rem" }} />
          <Skeleton variant="text" sx={{ fontSize: "1rem" }} />
          <Skeleton variant="text" sx={{ fontSize: "1rem" }} />
          <Skeleton variant="text" sx={{ fontSize: "1rem" }} />
        </Box>
      );
    }
    if (isError) {
      return (
        <Box sx={{ p: 3 }}>
          <p>Failed to load policy. Please try again later.</p>
        </Box>
      );
    }
    return (
      <div
        className="policy_content"
        dangerouslySetInnerHTML={{ __html: extractPolicyContent(data) }}
      />
    );
  };

  return (
    <section className="cms_pages u_spc">
      <div className="container">
        <BredCrum items={items} />
        <div className="rfund_plcy">
          <div className="s_head flex hd_6">
            <h2>Return & Refund Policy</h2>
            <div className="rt w_50">
              <Tabs
                value={value}
                onChange={handleChange}
                aria-label="Return and Refund tabs"
                className="site_tabs3"
              >
                <Tab label="Return Policy" {...a11yProps(0)} />
                <Tab label="Refund Policy" {...a11yProps(1)} />
              </Tabs>
            </div>
          </div>
          <Box sx={{ minHeight: "50vh", overflowY: "auto", pr: 2 }}>
            <CustomTabPanel value={value} index={0}>
              {renderContent(returnPolicy, isReturnLoading, isReturnError)}
            </CustomTabPanel>
            <CustomTabPanel value={value} index={1}>
              {renderContent(refundPolicy, isRefundLoading, isRefundError)}
            </CustomTabPanel>
          </Box>
        </div>
      </div>
    </section>
  );
}

export default RefundReturnPolicyPage;
