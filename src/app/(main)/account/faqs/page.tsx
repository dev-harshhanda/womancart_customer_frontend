"use client";
import React, { useEffect } from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import { useGetFaqsQuery } from "@/service/cms";

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

function FAQPage() {
    const [value, setValue] = React.useState(0);
    const { data, isLoading, isError } = useGetFaqsQuery();

    useEffect(() => {
        // Polyfill for toggleAccordion which is called by the HTML returned from API
        (window as any).toggleAccordion = function (arg: any) {
            if (arg === undefined || arg === null) return;

            let content: HTMLElement | null = null;
            let icon: HTMLElement | null = null;

            if (typeof arg === 'number' || !isNaN(Number(arg))) {
                const index = typeof arg === 'number' ? arg : Number(arg);
                content = document.getElementById(`content-${index}`);
                icon = document.getElementById(`icon-${index}`);
            } else {
                // Determine if the argument is an element or an event
                const element = arg instanceof Element ? arg : (arg.currentTarget instanceof Element ? arg.currentTarget : null);
                if (!element) return;

                // Fallback for closest if not supported or element is not as expected
                const findParent = (el: Element) => {
                    if (typeof el.closest === 'function') {
                        return el.closest('.faq-item') || el.parentElement;
                    }
                    // Manual search for .faq-item if closest is missing
                    let current: HTMLElement | null = el as HTMLElement;
                    while (current) {
                        if (current.classList && current.classList.contains('faq-item')) {
                            return current;
                        }
                        current = current.parentElement;
                    }
                    return el.parentElement;
                };

                const parent = findParent(element);
                if (!parent) return;

                content = parent.querySelector('.faq-content') || parent.querySelector('[id^="content-"]');
                icon = element.querySelector('.faq-icon') || element.querySelector('[id^="icon-"]');
            }

            if (content) {
                // Check if it's currently expanded
                const isExpanded = content.style.maxHeight && content.style.maxHeight !== '0px';

                if (isExpanded) {
                    content.style.maxHeight = '0px';
                    if (icon) {
                        icon.style.transform = 'rotate(0deg)';
                        // Handle text icons (+/-) if they exist
                        const iconSpan = icon.querySelector('span') || icon;
                        if (iconSpan.innerText === '-') iconSpan.innerText = '+';
                    }
                } else {
                    // Expand to scrollHeight
                    content.style.maxHeight = content.scrollHeight + 'px';
                    if (icon) {
                        // For SVGs, rotation is common. For text, we might swap.
                        icon.style.transform = 'rotate(45deg)';
                        // Handle text icons (+/-) if they exist
                        const iconSpan = icon.querySelector('span') || icon;
                        if (iconSpan.innerText === '+') iconSpan.innerText = '-';
                    }
                }
            }
        };


        return () => {
            delete (window as any).toggleAccordion;
        };
    }, []);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };

    const renderContent = (data: string | undefined, isLoading: boolean, isError: boolean) => {
        if (isLoading) {
            return (
                <Box sx={{ p: 3 }}>
                    <Skeleton variant="text" sx={{ fontSize: '1rem', mb: 1 }} />
                    <Skeleton variant="text" sx={{ fontSize: '1rem', mb: 1 }} />
                    <Skeleton variant="text" sx={{ fontSize: '1rem', mb: 1 }} />
                    <Skeleton variant="text" sx={{ fontSize: '1rem', mb: 1 }} />
                </Box>
            );
        }

        if (isError) {
            return (
                <Box sx={{ p: 3 }}>
                    <p>Failed to load FAQs. Please try again later.</p>
                </Box>
            );
        }

        return (
            <div
                className="policy_content"
                dangerouslySetInnerHTML={{ __html: data || "" }}
            />
        );
    };

    return (
        <>
            <div className="rfund_plcy">
                <div className="s_head flex hd_6 ">
                    <h2>FAQs</h2>
                    <div className="rt w_50">
                        <Tabs
                            value={value}
                            onChange={handleChange}
                            aria-label="basic tabs example"
                            className="site_tabs3"
                        >
                            <Tab label="FAQs" {...a11yProps(0)} />
                        </Tabs>
                    </div>
                </div>

                <Box sx={{ height: "calc(100vh)", overflowY: "auto", pr: 2, }}>
                    <CustomTabPanel value={value} index={0}>
                        {renderContent(data, isLoading, isError)}
                    </CustomTabPanel>
                </Box>
            </div>
        </>
    );
}

export default FAQPage;
