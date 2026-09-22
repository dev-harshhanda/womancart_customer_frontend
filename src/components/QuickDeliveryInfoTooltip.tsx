"use client";

import { useEffect } from "react";
import {
  Box,
  ClickAwayListener,
  IconButton,
  Paper,
  Popper,
  Typography,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";

type QuickDeliveryInfoTooltipProps = {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
};

export default function QuickDeliveryInfoTooltip({
  open,
  anchorEl,
  onClose,
}: QuickDeliveryInfoTooltipProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  return (
    <Popper
      open={open && Boolean(anchorEl)}
      anchorEl={anchorEl}
      placement="bottom-end"
      modifiers={[
        {
          name: "offset",
          options: {
            offset: [0, 10],
          },
        },
        {
          name: "flip",
          enabled: true,
          options: {
            fallbackPlacements: [
              "top-end",
              "bottom-start",
              "top-start",
            ],
            padding: 12,
          },
        },
        {
          name: "preventOverflow",
          enabled: true,
          options: {
            boundary: "viewport",
            padding: 12,
          },
        },
      ]}
      sx={{
        zIndex: (theme) => theme.zIndex.tooltip + 1,
      }}
    >
      <ClickAwayListener
        onClickAway={onClose}
        mouseEvent="onPointerDown"
        touchEvent="onTouchStart"
      >
        <Box
          sx={{
            position: "relative",

            // Small clean arrow
            "&::before": {
              content: '""',
              position: "absolute",
              top: -6,
              right: 28,
              width: 12,
              height: 12,
              bgcolor: "#fff",
              borderLeft: "1px solid var(--commerce-border)",
              borderTop: "1px solid var(--commerce-border)",
              transform: "rotate(45deg)",
              zIndex: 1,
            },
          }}
        >
          <Paper
            id="quick-delivery-info-tooltip"
            role="dialog"
            aria-labelledby="quick-delivery-info-title"
            aria-describedby="quick-delivery-info-description"
            elevation={0}
            sx={{
              position: "relative",

              width: {
                xs: "calc(100vw - 28px)",
                sm: "360px",
              },

              maxWidth: "360px",
              maxHeight: "70dvh",
              overflowY: "auto",

              px: {
                xs: 2,
                sm: 2.25,
              },

              py: 2,

              borderRadius: "14px",
              border: "1px solid var(--commerce-border)",
              bgcolor: "#fff",

              boxShadow:
                "0 10px 30px rgba(55, 20, 60, 0.12)",
            }}
          >
            {/* Close button */}
            <IconButton
              aria-label="Close 2-Hour Delivery information"
              size="small"
              onClick={onClose}
              sx={{
                position: "absolute",
                top: 8,
                right: 8,

                width: 30,
                height: 30,

                color: "var(--commerce-primary)",

                "&:hover": {
                  bgcolor: "var(--commerce-primary-light)",
                },
              }}
            >
              <CloseIcon sx={{ fontSize: 19 }} />
            </IconButton>

            {/* Heading */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                pr: 4,
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  flexShrink: 0,

                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",

                  borderRadius: "50%",

                  bgcolor: "var(--commerce-primary-light)",
                  color: "var(--commerce-primary)",
                }}
              >
                <BoltRoundedIcon sx={{ fontSize: 20 }} />
              </Box>

              <Typography
                id="quick-delivery-info-title"
                sx={{
                  fontSize: {
                    xs: "15px",
                    sm: "16px",
                  },

                  lineHeight: 1.3,
                  fontWeight: 700,
                  color: "var(--commerce-primary)",
                }}
              >
                Switch to 2-Hour Delivery
              </Typography>
            </Box>

            {/* Description */}
            <Typography
              id="quick-delivery-info-description"
              sx={{
                mt: 1.25,

                fontSize: {
                  xs: "14px",
                  sm: "15px",
                },

                lineHeight: 1.55,
                color: "var(--commerce-text)",
              }}
            >
              Get selected products in 2 hours — tap to switch.
            </Typography>

            {/* Availability */}
            <Box
              sx={{
                mt: 1.5,

                display: "flex",
                alignItems: "flex-start",
                gap: 0.75,

                px: 1.25,
                py: 1,

                borderRadius: "10px",

                bgcolor: "var(--commerce-primary-light)",
              }}
            >
              <LocationOnOutlinedIcon
                sx={{
                  mt: "1px",
                  fontSize: 18,
                  flexShrink: 0,
                  color: "var(--commerce-primary)",
                }}
              />

              <Typography
                variant="body2"
                sx={{
                  fontSize: "13px",
                  lineHeight: 1.45,
                  color: "var(--commerce-text)",
                }}
              >
                Availability depends on your delivery location.
              </Typography>
            </Box>
          </Paper>
        </Box>
      </ClickAwayListener>
    </Popper>
  );
}