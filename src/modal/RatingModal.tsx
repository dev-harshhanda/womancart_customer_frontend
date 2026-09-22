import { Dispatch, SetStateAction, useState, useEffect } from "react";
import CloseIcon from "@mui/icons-material/Close";
import { Button, Modal, Rating, TextField, Box } from "@mui/material";
import React from "react";
import toast from "react-hot-toast";
import { useRateOrderMutation } from "@/service/order";
import { useImageUploadMutation } from "@/service/auth";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  setOpen: Dispatch<SetStateAction<boolean>>;
  orderItems: any[]; // Expect an array of order items
  onSuccess?: () => void;
}

interface ItemRatingState {
  orderItemId: number | string;
  rating: number;
  comment: string;
  images: string[]; // Store uploaded image URLs
}

const extractOrderItemId = (item: any): number | string | null => {
  if (!item) return null;
  return (
    item.orderItemId ||
    item.order_item_id ||
    item.order_itemid ||
    item.id ||
    item.item_id ||
    item.orderId ||
    item.order_id ||
    null
  );
};

const getOrderItemProductName = (orderItem: any): string => {
  if (!orderItem) return "Product";

  const product = orderItem.product || orderItem.product_details || orderItem.productData;
  const variation = orderItem.variation || orderItem.product_variation || {};

  const nameCandidates = [
    product?.product_name,
    product?.name,
    product?.title,
    product?.display_name,
    orderItem?.product_name,
    orderItem?.product_title,
    orderItem?.item_name,
    orderItem?.title,
    variation?.product_name,
    variation?.name,
  ];

  const pickedName = nameCandidates.find(
    (value) => typeof value === "string" && value.trim().length > 0
  );

  return pickedName ? String(pickedName).trim() : "Product";
};

export default function RatingModal({
  open,
  onClose,
  setOpen,
  orderItems = [],
  onSuccess,
}: ModalProps) {
  const [itemRatings, setItemRatings] = useState<ItemRatingState[]>(() => {
    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      return [];
    }
    return orderItems.map((item) => {
      const orderItemId = extractOrderItemId(item);
      if (!orderItemId) {
   
      }
      return {
        orderItemId: orderItemId || 0,
        rating: 0,
        comment: "",
        images: [],
      };
    });
  });
  const [rateOrder, { isLoading: isSubmittingRating }] = useRateOrderMutation();
  const [imageUpload] = useImageUploadMutation();
  const [uploadingItemId, setUploadingItemId] = useState<number | string | null>(null);

  const extractUploadedImageUrl = (res: any): string => {
    // imageUpload API commonly returns: { image: "https://..." }
    const url =
      res?.image ||
      res?.data?.image ||
      res?.data?.data?.image ||
      res?.data ||
      "";
    return typeof url === "string" ? url : "";
  };

  // Helper function to check if order item already has a review
  const hasReview = (item: any): boolean => {
    const ratingsReviews = item?.ratings_reviews || [];
    return Array.isArray(ratingsReviews) && ratingsReviews.length > 0;
  };

  // Reset form when modal opens - don't retain old data
  useEffect(() => {
    if (open) {
      // Reset all ratings when modal opens
      if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
        setItemRatings([]);
        return;
      }
      
      // Initialize fresh ratings with empty values
      const freshRatings = orderItems.map((item) => {
        const orderItemId = extractOrderItemId(item);
        if (!orderItemId) {
        }
        return {
          orderItemId: orderItemId || 0,
          rating: 0,
          comment: "",
          images: [],
        };
      });
      
      setItemRatings(freshRatings);
    } else {
      // Clear ratings when modal closes
      setItemRatings([]);
    }
  }, [open, orderItems]);

  const handleRatingChange = (
    orderItemId: number | string,
    newRating: number | null
  ) => {
    setItemRatings((prevRatings) =>
      prevRatings.map((item) =>
        item.orderItemId === orderItemId
          ? { ...item, rating: newRating || 0 }
          : item
      )
    );
  };

  const handleCommentChange = (
    orderItemId: number | string,
    newComment: string
  ) => {
    setItemRatings((prevRatings) =>
      prevRatings.map((item) =>
        item.orderItemId === orderItemId
          ? { ...item, comment: newComment }
          : item
      )
    );
  };

  const handleImageUpload = async (
    orderItemId: number | string,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);
    // allow selecting same file again
    event.target.value = "";

    if (files.length === 0) return;

    setUploadingItemId(orderItemId);
    try {
      for (const file of files) {
        const formData = new FormData();
        // IMPORTANT: this API expects "image" (matches existing profile upload)
        formData.append("image", file);

        const res: any = await imageUpload({ body: formData }).unwrap();
        const imageUrl = extractUploadedImageUrl(res);

        if (!imageUrl || !imageUrl.startsWith("http")) {
       
          throw new Error("Failed to upload image");
        }

        setItemRatings((prevRatings) =>
          prevRatings.map((item) =>
            item.orderItemId === orderItemId
              ? { ...item, images: [...item.images, imageUrl] }
              : item
          )
        );
      }
      toast.success("Image uploaded successfully!");
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "Failed to upload image");
    } finally {
      setUploadingItemId(null);
    }
  };

  const handleSubmit = async () => {
    if (itemRatings.length === 0) {
      toast.error("No items to rate.");
      return;
    }

    // Check if any item already has a review
    const itemsWithReviews: string[] = [];
    orderItems.forEach((item) => {
      const orderItemId = extractOrderItemId(item);
      if (orderItemId && hasReview(item)) {
        const productName = item.product_name || item.name || "Product";
        itemsWithReviews.push(productName);
      }
    });

    if (itemsWithReviews.length > 0) {
      toast.error(`You have already submitted your review for: ${itemsWithReviews.join(", ")}`);
      setOpen(false);
      return;
    }

    // Filter out items without valid orderItemId
    const validRatings = itemRatings.filter((item) => item.orderItemId && item.orderItemId !== 0);
    if (validRatings.length === 0) {
      toast.error("No valid order items found to rate.");
      return;
    }

    const allRatingsValid = validRatings.every((item) => item.rating > 0);
    if (!allRatingsValid) {
      toast.error("Please provide a rating for all products.");
      return;
    }

    try {
      const promises = validRatings.map(async (item) => {
        // Double check if review already exists before submitting
        const orderItem = orderItems.find((oi) => extractOrderItemId(oi) === item.orderItemId);
        if (orderItem && hasReview(orderItem)) {
          throw new Error("Review already exists for this item");
        }

        const payload: any = {
          orderItemId: item.orderItemId,
          rating: item.rating,
        };
        
        if (item.comment && item.comment.trim()) {
          payload.comment = item.comment.trim();
        }
        
        if (item.images.length > 0) {
          const imageUrls = item.images.filter((img) => typeof img === 'string' && img.startsWith('http'));
          if (imageUrls.length > 0) {
            payload.images = imageUrls;
          }
        }
        
        return rateOrder(payload).unwrap();
      });

      const results = await Promise.all(promises);
      toast.success("Ratings submitted successfully!");
      
      // Reset form after successful submission
      setItemRatings(() => {
        if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
          return [];
        }
        return orderItems.map((item) => {
          const orderItemId = extractOrderItemId(item);
          return {
            orderItemId: orderItemId || 0,
            rating: 0,
            comment: "",
            images: [],
          };
        });
      });
      
      setOpen(false);
      
      // Dispatch custom event to notify product detail pages to refetch reviews
      // Include product information in the event for better targeting
      if (typeof window !== "undefined") {
        const reviewEvent = new CustomEvent('reviewSubmitted', {
          detail: {
            timestamp: new Date().toISOString(),
            orderItems: validRatings
          }
        });
        window.dispatchEvent(reviewEvent);
        
        // Also dispatch event to refetch orders
        const ordersRefetchEvent = new CustomEvent('refetchOrders');
        window.dispatchEvent(ordersRefetchEvent);
      }
      
      onSuccess?.();
    } catch (err: any) {
     
      const errorMessage = err?.data?.message || err?.message || "Failed to submit ratings";
      if (errorMessage.includes("already") || errorMessage.includes("exists")) {
        toast.error("You have already submitted your review for this product.");
      } else {
        toast.error(errorMessage);
      }
    }
  };

  // Reset form when closing modal
  const handleClose = () => {
    // Reset form data
    setItemRatings(() => {
      if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
        return [];
      }
      return orderItems.map((item) => {
        const orderItemId = extractOrderItemId(item);
        return {
          orderItemId: orderItemId || 0,
          rating: 0,
          comment: "",
          images: [],
        };
      });
    });
    setOpen(false);
    onClose();
  };

  return (
    <Modal className="modal rating_modal" open={open} onClose={handleClose}>
      <div className="modal-dialog">
        <div className="modal-body">
          <div className="btn-close" onClick={handleClose}>
            <CloseIcon />
          </div>
          <div className="modal_title hd_3 d_block">
            <h2>Rate Order</h2>
          </div>

          <form className="form">
            {(!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <p>No items available to rate.</p>
              </div>
            ) : (
              orderItems.map((orderItem, index) => {
              const currentOrderItemId = extractOrderItemId(orderItem);
              const itemState = itemRatings.find(
                (r) => r.orderItemId === currentOrderItemId
              );
              const productName = getOrderItemProductName(orderItem);
              const alreadyReviewed = hasReview(orderItem);

              if (!currentOrderItemId) {
                
                return null;
              }

              return (
                <React.Fragment key={currentOrderItemId || index}>
                  {alreadyReviewed ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--commerce-primary)', }} >
                      <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>You have already submitted your review for {productName}</p>
                    </div>
                  ) : (
                    <>
                      <div className="gap_p">
                        <div className="control_group">
                          <label>{productName}</label>
                          <Rating
                            name={`rating-${currentOrderItemId}`}
                            value={itemState?.rating || 0}
                            onChange={(event, newValue) =>
                              handleRatingChange(currentOrderItemId, newValue)
                            }
                          />
                        </div>
                        <div className="control_group">
                          <TextField
                            fullWidth
                            hiddenLabel
                            placeholder="Add Comment"
                            multiline
                            minRows={4}
                            value={itemState?.comment || ""}
                            onChange={(e) =>
                              handleCommentChange(currentOrderItemId, e.target.value)
                            }
                          ></TextField>
                        </div>
                      </div>
                      <div className="btn_group mt_20">
                        <Button
                          variant="outlined"
                          component="label"
                          disabled={isSubmittingRating || uploadingItemId === currentOrderItemId}
                        >
                          <img src="/images/camera2_icon.svg" alt="Icon" />{" "}
                          {uploadingItemId === currentOrderItemId ? "Uploading..." : "Upload Photo"}
                          <input
                            type="file"
                            hidden
                            accept="image/*"
                            multiple
                            onChange={(e) =>
                              handleImageUpload(currentOrderItemId, e)
                            }
                          />
                        </Button>
                        <Button onClick={handleSubmit} disabled={isSubmittingRating}>
                          {isSubmittingRating ? "Submitting..." : "Submit"}
                        </Button>
                      </div>
                      {itemState?.images && itemState.images.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                          {itemState.images.map((img, imgIndex) => (
                            <img
                              key={imgIndex}
                              src={img}
                              alt={`Upload Preview ${imgIndex + 1}`}
                              style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 4 }}
                            />
                          ))}
                        </Box>
                      )}
                    </>
                  )}
                  {index < orderItems.length - 1 && <hr style={{ margin: '20px 0' }} />}
                </React.Fragment>
              );
            })
            )}
          </form>
        </div>
      </div>
    </Modal>
  );
}
