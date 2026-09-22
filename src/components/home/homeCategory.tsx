/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useRouter } from "next/navigation";
import { buildCategoryUrl } from "@/utils/urlBuilder";
import React, { useState } from "react";
import { useViewAllCategoryQuery } from "@/service/home";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Box,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

function HomeCategory() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [openChildrenModal, setOpenChildrenModal] = useState(false);
  
  // Fetch categories from API - use undefined instead of {} to avoid infinite re-renders
  const { data: categoriesData, isLoading: categoriesLoading, error: categoriesError } = useViewAllCategoryQuery(undefined);
  const categories = categoriesData?.data || [];

  const handleSelect = (category: any, index: number) => {
    setActiveIndex(index);
    
    // Check if category has children
    if (category.children && category.children.length > 0) {
      setSelectedCategory(category);
      setOpenChildrenModal(true);
    } else {
      router.push(
        buildCategoryUrl(
          [category.name || category.category_name || ""],
          { category_id: category.id || category.category_id },
        ),
      );
    }
  };

  const handleChildCategoryClick = (childCategory: any) => {
    setOpenChildrenModal(false);
    router.push(
      buildCategoryUrl(
        [
          selectedCategory?.name || selectedCategory?.category_name || "",
          childCategory.name || childCategory.category_name || "",
        ],
        { category_id: childCategory.id || childCategory.category_id },
      ),
    );
  };

  const handleViewAllProducts = () => {
    setOpenChildrenModal(false);
    if (selectedCategory) {
      router.push(
        buildCategoryUrl(
          [selectedCategory.name || selectedCategory.category_name || ""],
          { category_id: selectedCategory.id || selectedCategory.category_id },
        ),
      );
    }
  };

  if (categoriesLoading) {
    return (
      <section className="category_sc">
        <div className="container">
          <div className="category_grid">
            <p>Loading categories...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="category_sc">
        <div className="container">
          <div className="category_grid">
            {categories.length > 0 ? (
              categories.map((category: any, index: number) => (
                <div
                  key={`home-category-${category.id || category.category_id || 'no-id'}-${index}`}
                  className={`category_bx cursor_pointer ${activeIndex === index ? "active" : ""}`}
                  onClick={() => handleSelect(category, index)}
                >
                  <figure>
                    <img
                      src={category.image || category.image_url || "/images/cat_icon1.svg"}
                      alt={category.name || category.category_name || "Category"}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/images/cat_icon1.svg";
                      }}
                    />
                  </figure>
                  <h3>{category.name || category.category_name || "Category"}</h3>
                </div>
              ))
            ) : (
              <p>No categories available</p>
            )}
          </div>
        </div>
      </section>

      {/* Children Categories Modal */}
      <Dialog
        open={openChildrenModal}
        onClose={() => setOpenChildrenModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <h2>{selectedCategory?.name || selectedCategory?.category_name || "Subcategories"}</h2>
            <IconButton onClick={() => setOpenChildrenModal(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedCategory?.children && selectedCategory.children.length > 0 ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "16px" }}>
                {selectedCategory.children.map((child: any, index: number) => (
                  <Box
                    key={`home-child-category-${child.id || child.category_id || 'no-id'}-${index}`}
                    className="category_bx cursor_pointer"
                    onClick={() => handleChildCategoryClick(child)}
                    sx={{
                      padding: 2,
                      textAlign: "center",
                      border: "1px solid #e0e0e0",
                      borderRadius: 2,
                      "&:hover": {
                        borderColor: "var(--commerce-primary)",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      },
                    }}
                  >
                    <figure>
                      <img
                        src={child.image || child.image_url || "/images/cat_icon1.svg"}
                        alt={child.name || child.category_name || "Subcategory"}
                        style={{ width: "100%", height: "auto" }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/images/cat_icon1.svg";
                        }}
                      />
                    </figure>
                    <h3 style={{ marginTop: 8, fontSize: "0.9rem" }}>
                      {child.name || child.category_name || "Subcategory"}
                    </h3>
                  </Box>
                ))}
              </div>
              <Box mt={3} textAlign="center">
                <Button
                  onClick={handleViewAllProducts}
                  sx={{
                    padding: "10px 20px",
                    backgroundColor: "var(--commerce-primary)",
                    color: "white",
                    border: "none",
                    borderRadius: 1,
                    fontSize: "1rem",
                    textTransform: "none",
                    "&:hover": {
                      backgroundColor: "var(--commerce-primary-hover)",
                    },
                  }}
                >
                  View All Products in {selectedCategory?.name || selectedCategory?.category_name}
                </Button>
              </Box>
            </>
          ) : (
            <p>No subcategories available</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default HomeCategory;
