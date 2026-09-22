"use client";
import { Button, Menu, MenuItem } from "@mui/material";
import React, { useState } from "react";
import ShareIcon from "@mui/icons-material/Share";
import toast from "react-hot-toast";

const menuData = [
  { icon: "/images/whatsapp_icon.svg", label: "What’s App" },
  { icon: "/images/fb_icon.svg", label: "Facebook" },
  { icon: "/images/email_icon.svg", label: "Email" },
  { icon: "/images/instagram_icon2.svg", label: "Instagram" },
  { icon: "/images/link_icon.svg", label: "Copy Link" },
] as const;

function getPageUrl(): string {
  if (typeof window === "undefined") return "";
  return window.location.href;
}

async function copyPageUrl(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}
interface ShareProductProps {
  productUrl?: string;
}

function ShareProduct({ productUrl }: ShareProductProps = {}) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleItemClick = async (index: number, label: string) => {
    setActiveIndex(index);
    const url = productUrl || getPageUrl();
    if (!url) {
      toast.error("Could not get page link");
      handleClose();
      return;
    }

    const subject = url.includes("/wishlist")
      ? "Wishlist link"
      : "Product link";
    const body = url.includes("/wishlist")
      ? `Check out this wishlist:\n\n${url}`
      : `Check out this product:\n\n${url}`;

    switch (label) {
      case "What’s App": {
        const ok = await copyPageUrl(url);
        if (ok) toast.success("Link copied");
        else toast.error("Could not copy link");
        window.open(
          `https://api.whatsapp.com/send?text=${encodeURIComponent(url)}`,
          "_blank",
          "noopener,noreferrer",
        );
        break;
      }
      case "Facebook": {
        const ok = await copyPageUrl(url);
        if (ok) toast.success("Link copied");
        else toast.error("Could not copy link");
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
          "_blank",
          "noopener,noreferrer",
        );
        break;
      }
      case "Email": {
        window.open(
          `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
          "_blank",
          "noopener,noreferrer",
        );
        break;
      }
      case "Instagram": {
        const ok = await copyPageUrl(url);
        if (ok) toast.success("Link copied");
        else toast.error("Could not copy link");
        window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
        break;
      }
      case "Copy Link": {
        const ok = await copyPageUrl(url);
        if (ok) toast.success("Link copied");
        else toast.error("Could not copy link");
        break;
      }
      default:
        break;
    }

    handleClose();
  };

  return (
    <>
      <Button
        variant="outlined"
        color="info"
        className="icon_btn share_btn"
        id="demo-positioned-button"
        aria-controls={open ? "demo-positioned-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        onClick={handleClick}
      >
        <ShareIcon />
      </Button>

      <Menu
        id="demo-positioned-menu"
        aria-labelledby="demo-positioned-button"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        className="share_menu"
        slotProps={{
          paper: {
            // Filter out invalid props like fullWidth that might be passed to DOM
            sx: {},
          },
        }}
      >
        {menuData.map((item, index) => (
          <MenuItem
            key={index}
            onClick={() => void handleItemClick(index, item.label)}
            className={activeIndex === index ? "active" : ""}
          >
            <img src={item.icon} alt={item.label} />
            {item.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export default ShareProduct;
