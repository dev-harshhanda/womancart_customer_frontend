import React from "react";
import { Box, Typography, Button, Modal, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface GuestLoginModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

const GuestLoginModal = ({
  open,
  onClose,
  title = "Unlock the Full Experience!",
  description = "Log in or Sign up to wishlist your favorites, follow brands, and enjoy a faster checkout.",
}: GuestLoginModalProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleLogin = () => {
    onClose();
    const qs = searchParams.toString();
    const returnPath = `${pathname || "/"}${qs ? `?${qs}` : ""}`;
    router.push(`/auth/login?redirect=${encodeURIComponent(returnPath)}`);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="guest-login-modal-title"
      aria-describedby="guest-login-modal-description"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1400, // Ensure it's above other elements
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: { xs: "90%", sm: "420px", md: "450px" },
          bgcolor: "background.paper",
          borderRadius: "28px",
          boxShadow: "0 24px 80px rgba(0,0,0,0.18)",
          p: { xs: 3, sm: 4, md: 5 },
          outline: "none",
          textAlign: "center",
          overflow: "hidden",
        }}
      >
        {/* Decorative Background Element */}
        <Box
          sx={{
            position: "absolute",
            top: -50,
            right: -50,
            width: "150px",
            height: "150px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, color-mix(in srgb, var(--commerce-primary) 10%, transparent) 0%, color-mix(in srgb, var(--commerce-primary) 5%, transparent) 100%)",
            zIndex: 0,
          }}
        />

        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 16,
            top: 16,
            color: "#999",
            zIndex: 1,
            "&:hover": { color: "#333" },
          }}
        >
          <CloseIcon />
        </IconButton>

        <Box sx={{ position: "relative", zIndex: 1 }}>
          <Box
            component="img"
            src="/images/login_prompt_icon.svg"
            alt="Login"
            sx={{
              width: "80px",
              height: "80px",
              mb: 3,
              mx: "auto",
              display: "block",
              opacity: 0.9,
            }}
            onError={(e: any) => {
              e.target.style.display = "none";
            }}
          />

          <Typography
            id="guest-login-modal-title"
            variant="h5"
            sx={{
              fontWeight: 800,
              color: "#1a1a1a",
              mb: 2,
              fontSize: { xs: "20px", sm: "22px", md: "24px" },
              fontFamily: "'Jost', sans-serif !important",
            }}
          >
            {title}
          </Typography>

          <Typography
            id="guest-login-modal-description"
            sx={{
              color: "#666",
              mb: 4,
              lineHeight: 1.6,
              fontSize: { xs: "14px", sm: "15px" },
              fontFamily: "'Jost', sans-serif !important",
            }}
          >
            {description}
          </Typography>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <Button
              fullWidth
              variant="contained"
              onClick={handleLogin}
              sx={{
                background: "var(--commerce-primary)",
                color: "#fff",
                py: 1.8,
                borderRadius: "14px",
                textTransform: "none",
                fontSize: "16px",
                fontWeight: 700,
                boxShadow: "0 8px 20px color-mix(in srgb, var(--commerce-primary) 30%, transparent)",
                fontFamily: "'Jost', sans-serif !important",
                "&:hover": {
                  background: "var(--commerce-primary-hover)",
                  boxShadow: "0 10px 25px color-mix(in srgb, var(--commerce-primary) 40%, transparent)",
                },
              }}
            >
              Login / Sign Up
            </Button>

            <Button
              fullWidth
              variant="text"
              onClick={onClose}
              sx={{
                color: "#777",
                py: 1.2,
                textTransform: "none",
                fontSize: "14px",
                fontWeight: 500,
                fontFamily: "'Jost', sans-serif !important",
                "&:hover": {
                  bgcolor: "rgba(0,0,0,0.03)",
                  color: "#333",
                },
              }}
            >
              Skip
            </Button>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
};

export default GuestLoginModal;
