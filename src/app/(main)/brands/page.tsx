"use client";

import React from "react";
import BrandsListing from "@/components/brands/BrandsListing";
import { Box, Typography } from "@mui/material";

const BrandsPage = () => {
  return (
    <Box sx={{ py: 4, px: { xs: 2, md: 4 }, maxWidth: "1400px", margin: "0 auto" }}>
      <Typography 
        variant="h4" 
        sx={{ 
          mb: 4, 
          fontWeight: 700, 
          color: "#333", 
          textAlign: "center",
          letterSpacing: -0.5
        }}
      >
        Explore Our Brands
      </Typography>
      
      <Box sx={{ 
        boxShadow: "0 10px 40px rgba(0,0,0,0.08)", 
        borderRadius: "16px", 
        overflow: "hidden",
        border: "1px solid #f0f0f0"
      }}>
        <BrandsListing variant="page" />
      </Box>
    </Box>
  );
};

export default BrandsPage;
