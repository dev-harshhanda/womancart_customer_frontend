"use client";
import React, { useMemo } from "react";
import { useGetAboutUsQuery } from "@/service/cms";
import { extractPolicyContent } from "@/utils/cmsContent";
import Skeleton from "@mui/material/Skeleton";

function AboutUs() {
  const { data, isLoading, isError } = useGetAboutUsQuery();

  const content = useMemo(() => extractPolicyContent(data), [data]);

  if (isError) {
    return (
      <div className="cms_content">
        <p>Something went wrong while loading the content. Please try again later.</p>
      </div>
    );
  }

  return (
    <>
      <div className="s_head flex hd_6">
        <h2>About Us</h2>
      </div>
      <div className="cms_content">
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
    </>
  );
}

export default AboutUs;

