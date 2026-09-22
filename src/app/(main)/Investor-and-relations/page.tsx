"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button, Skeleton } from "@mui/material";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import DownloadIcon from "@mui/icons-material/Download";
import styles from "./investor.module.scss";
import { useGetInvestorRelationsQuery } from "@/service/investorRelations";
import { getDocumentTitle, getDocumentUrl } from "@/utils/cmsMedia";

const INVESTOR_PAGE_SLUG = "investor-and-relations";

export default function InvestorRelationsPage() {
  const { data: response, isLoading, isError } = useGetInvestorRelationsQuery({
    slug: INVESTOR_PAGE_SLUG,
  });

  const page = response?.data;
  const tabs = useMemo(
    () =>
      [...(page?.tabs ?? [])].sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
      ),
    [page?.tabs],
  );

  const [activeTabSlug, setActiveTabSlug] = useState<string | null>(null);

  useEffect(() => {
    if (tabs.length > 0 && !activeTabSlug) {
      setActiveTabSlug(tabs[0].slug);
    }
  }, [tabs, activeTabSlug]);

  const activeTab = tabs.find((tab) => tab.slug === activeTabSlug) ?? tabs[0];

  const handleDownload = (doc: Record<string, unknown>) => {
    const fileUrl = getDocumentUrl(doc);
    if (fileUrl) {
      window.open(fileUrl, "_blank", "noopener,noreferrer");
      return;
    }
  };

  if (isError) {
    return (
      <section className="bg_grey u_spc d_block investor-relations" style={{ minHeight: "80vh" }}>
        <div className="container whiteBox" style={{ padding: "30px", borderRadius: "15px", backgroundColor: "#fff" }}>
          <p>Unable to load investor relations page. Please try again later.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg_grey u_spc d_block investor-relations" style={{ minHeight: "80vh" }}>
      <div
        className="container whiteBox"
        style={{ padding: "30px", borderRadius: "15px", backgroundColor: "#fff" }}
      >
        <div className="hd_2 mb_30">
          {isLoading ? (
            <Skeleton variant="text" width={220} height={36} />
          ) : (
            <h2 className="c_heading" style={{ fontSize: "24px", fontWeight: "600" }}>
              {page?.page_title || "Investor Relation"}
            </h2>
          )}
        </div>

        <div className={styles.layoutWrapper}>
          <div className={styles.sidebar}>
            <ul className={styles.navList}>
              {isLoading
                ? [0, 1, 2, 3, 4].map((i) => (
                    <li key={i} style={{ padding: "16px 20px" }}>
                      <Skeleton variant="text" width="80%" />
                    </li>
                  ))
                : tabs.map((tab) => (
                    <li
                      key={tab.slug}
                      className={`${styles.navItem} ${
                        activeTab?.slug === tab.slug ? styles.active : ""
                      }`}
                      onClick={() => setActiveTabSlug(tab.slug)}
                    >
                      <span className={styles.navText}>{tab.title}</span>
                      <ArrowForwardIosIcon className={styles.navIcon} />
                    </li>
                  ))}
            </ul>
          </div>

          <div className={styles.contentArea}>
            {isLoading ? (
              <>
                <Skeleton variant="text" width={200} height={32} style={{ marginBottom: 20 }} />
                <div className="gap_p">
                  {[0, 1].map((i) => (
                    <div className="w_33" key={i}>
                      <Skeleton variant="rectangular" height={120} />
                    </div>
                  ))}
                </div>
              </>
            ) : activeTab ? (
              <>
                <div className="hd_4 mb_20">
                  <h4 className="c_heading">{activeTab.title}</h4>
                </div>
                {(activeTab.documents ?? []).length > 0 ? (
                  <div className="gap_p">
                    {activeTab.documents?.map((doc, idx) => {
                      const fileUrl = getDocumentUrl(doc);
                      return (
                        <div className="w_33" key={`${activeTab.slug}-${idx}`}>
                          <div className={styles.downloadCard}>
                            <div className={styles.cardHeader}>
                              <p>{getDocumentTitle(doc)}</p>
                            </div>
                            <Button
                              className={`w_100 ${styles.downloadBtn}`}
                              variant="contained"
                              color="primary"
                              disabled={!fileUrl}
                              onClick={() => handleDownload(doc)}
                              endIcon={<DownloadIcon />}
                            >
                              Download
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ color: "#6b7280" }}>
                    No documents available in this section yet.
                  </p>
                )}
              </>
            ) : (
              <p style={{ color: "#6b7280" }}>No sections available yet.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
