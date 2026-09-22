"use client";
import React, { useMemo } from "react";
import { useGetTermsConditionsQuery } from "@/service/cms";
import { extractPolicyContent } from "@/utils/cmsContent";
import Skeleton from "@mui/material/Skeleton";

function TermsConditions() {
  const { data, isLoading, isError } = useGetTermsConditionsQuery();

  const content = useMemo(() => extractPolicyContent(data), [data]);

  if (isError) {
    return (
      <div className="rfund_plcy">
        <div className="s_head flex hd_6">
          <h2>Terms & Conditions</h2>
        </div>
        <div className="cntnt_mn">
          <p>Something went wrong while loading the content. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rfund_plcy">
        <div className="s_head flex hd_6 ">
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
    </>
  );
}

export default TermsConditions;
