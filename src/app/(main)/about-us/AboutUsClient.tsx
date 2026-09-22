"use client";
import React, { useMemo } from "react";
import BredCrum from "@/components/bredCrum";
import { useGetAboutUsQuery } from "@/service/cms";
import { extractPolicyContent } from "@/utils/cmsContent";
import Skeleton from "@mui/material/Skeleton";

const items = [{ label: "Home", path: "/" }, { label: "About Us" }];

function AboutUsPage() {
  const { data, isLoading, isError } = useGetAboutUsQuery();

  const content = useMemo(() => extractPolicyContent(data), [data]);

  if (isError) {
    return (
      <section className="cms_pages u_spc">
        <div className="container">
          <BredCrum items={items} />
          <div className="s_head flex hd_6">
            <h2>About Us</h2>
          </div>
          <div className="cms_content">
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
      </div>
    </section>
  );
}

export default AboutUsPage;
