"use client";
import React, { useMemo } from "react";
import BredCrum from "@/components/bredCrum";
import { useGetTermsConditionsQuery } from "@/service/cms";
import { extractPolicyContent } from "@/utils/cmsContent";
import Skeleton from "@mui/material/Skeleton";

const items = [{ label: "Home", path: "/" }, { label: "Terms & Conditions" }];

function TermsConditionsPage() {
  const { data, isLoading, isError } = useGetTermsConditionsQuery();

  const content = useMemo(() => extractPolicyContent(data), [data]);

  if (isError) {
    return (
      <section className="cms_pages u_spc">
        <div className="container">
          <BredCrum items={items} />
          <div className="s_head flex hd_6">
            <h2>Terms & Conditions</h2>
          </div>
          <div className="cntnt_mn">
            <p>Something went wrong while loading the content. Please try again later.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="cms_pages u_spc">
      <div className="container">
        <BredCrum items={items} />
        <div className="s_head flex hd_6">
          <h2>Terms & Conditions</h2>
        </div>
        <div className="cntnt_mn">
          {isLoading ? (
            <>
              <Skeleton variant="text" height={40} width="60%" style={{ marginBottom: 20 }} />
              <Skeleton variant="rectangular" height={200} style={{ marginBottom: 20 }} />
              <Skeleton variant="rectangular" height={150} />
            </>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: content }} />
          )}
        </div>
      </div>
    </section>
  );
}

export default TermsConditionsPage;
