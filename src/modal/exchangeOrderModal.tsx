import { Dispatch, SetStateAction, useState, useEffect } from "react";
import CloseIcon from "@mui/icons-material/Close";
import { Button, FormControlLabel, Modal, Radio, RadioGroup, TextField, CircularProgress, Box, Typography } from "@mui/material";
import React from "react";
import toast from "react-hot-toast";
import { useExchangeOrderMutation, useGetExchangeProductDetailsQuery } from "@/service/order";
import { formatPriceInr } from "@/utils/format";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  setOpen: Dispatch<SetStateAction<boolean>>;
  orderItemId?: number | string | null;
  orderId?: number | string | null;
  productId?: number | string | null;
  productName?: string;
  productSize?: string;
  productQuantity?: number;
  productPrice?: number | string;
  productImage?: string;
  deliveryAddress?: string;
  onSuccess?: () => void;
}

const exchangeReasons = [
  { value: "size_too_small", label: "Size is too small" },
  { value: "size_too_large", label: "Size is too large" },
  { value: "wrong_size_delivered", label: "Wrong size delivered" },
  { value: "fit_not_good", label: "Fit is not good" },
  { value: "different_color", label: "I want a different color" },
  { value: "other", label: "Other" },
];

export default function ExchangeOrderModal({
  open,
  onClose,
  setOpen,
  orderItemId,
  orderId,
  productId,
  productName: propProductName,
  productSize: propProductSize,
  productQuantity: propProductQuantity,
  productPrice: propProductPrice,
  productImage: propProductImage,
  deliveryAddress: propDeliveryAddress,
  onSuccess,
}: ModalProps) {
  const [step, setStep] = useState(1);
  const [selectedReason, setSelectedReason] = useState(exchangeReasons[0].value);
  const [otherReason, setOtherReason] = useState("");
  const [selectedVariationId, setSelectedVariationId] = useState<number | null>(null);

  const [exchangeOrder, { isLoading: isSubmitting }] = useExchangeOrderMutation();

  // Fetch product details when moving to step 2
  const { data: productDetailsResponse, isLoading: isLoadingProduct, error: productError } = useGetExchangeProductDetailsQuery(
    { productId: productId || "" },
    { skip: !productId || step !== 2 }
  );

  const productDetails = productDetailsResponse?.data?.data || productDetailsResponse?.data || null;

  // Reset step when modal closes
  useEffect(() => {
    if (!open) {
      setStep(1);
      setSelectedReason(exchangeReasons[0].value);
      setOtherReason("");
      setSelectedVariationId(null);
    }
  }, [open]);

  const handleReasonChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedReason(event.target.value);
    if (event.target.value !== "other") {
      setOtherReason(""); // Clear other reason if a specific one is selected
    }
  };

  const handleNext = () => {
    if (!orderItemId) {
      toast.error("Order item not found. Please try again.");
      return;
    }

    let exchangeReason = selectedReason;
    if (selectedReason === "other") {
      if (!otherReason.trim()) {
        toast.error("Please specify the reason for exchange.");
        return;
      }
      exchangeReason = otherReason.trim();
    }

    if (!exchangeReason) {
      toast.error("Please select or specify a reason for exchange.");
      return;
    }

    // Move to step 2
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleSubmit = async () => {
    if (!orderItemId) {
      toast.error("Order item not found. Please try again.");
      return;
    }

    if (!productId) {
      toast.error("Product information not found. Please try again.");
      return;
    }

    if (!selectedVariationId) {
      toast.error("Please select a new size/variation.");
      return;
    }

    let exchangeReason = selectedReason;
    if (selectedReason === "other") {
      exchangeReason = otherReason.trim();
    }

    try {
      const res = await exchangeOrder({
        previousOrderItemId: Number(orderItemId),
        product_id: Number(productId),
        newVariationId: selectedVariationId,
        reason: exchangeReason,
      }).unwrap();

      toast.success(res?.message || "Exchange request submitted successfully");
      setOpen(false);
      onSuccess?.();
    } catch (err: any) {
      const message = err?.data?.message || err?.message || "Failed to submit exchange request";
      toast.error(message);
    }
  };

  // Extract variations from product details
  const variations = productDetails?.variations || productDetails?.product_variations || [];

  // Extract delivery address from prop, product details, or order
  const deliveryAddress = propDeliveryAddress ||
    productDetails?.delivery_address ||
    productDetails?.address ||
    productDetails?.shipping_address ||
    "";

  // Extract product image - use prop first, then product details
  const productImage = propProductImage ||
    productDetails?.image ||
    productDetails?.product_image ||
    (Array.isArray(productDetails?.images) && productDetails.images.length > 0 ? productDetails.images[0] : null) ||
    "/images/placeholder.png";

  // Extract product name - use prop first, then product details
  const productName = propProductName ||
    productDetails?.product_name ||
    productDetails?.name ||
    "Product";

  // Extract product size - use prop first, then product details
  const productSize = propProductSize ||
    productDetails?.size ||
    productDetails?.variation?.size ||
    "N/A";

  // Extract product quantity - use prop first, then product details
  const productQuantity = propProductQuantity ||
    productDetails?.quantity ||
    productDetails?.qty ||
    1;

  // Extract product price - use prop first, then product details
  const productPrice = propProductPrice ||
    productDetails?.price ||
    productDetails?.product_price ||
    productDetails?.amount ||
    "0.00";

  // Extract size/color attributes from variations
  const getVariationDisplayName = (variation: any) => {
    if (variation?.name) return variation.name;
    if (variation?.variation_name) return variation.variation_name;

    // Try to get from attributes
    const attributes = variation?.variation_attributes || variation?.attributes || [];
    const sizeAttr = attributes.find((attr: any) =>
      attr?.attribute?.name?.toLowerCase().includes('size') ||
      attr?.name?.toLowerCase().includes('size')
    );
    const colorAttr = attributes.find((attr: any) =>
      attr?.attribute?.name?.toLowerCase().includes('color') ||
      attr?.name?.toLowerCase().includes('color')
    );

    if (sizeAttr) {
      return sizeAttr.attribute_option?.display_value || sizeAttr.value || sizeAttr.attribute_option?.value || "N/A";
    }
    if (colorAttr) {
      return colorAttr.attribute_option?.display_value || colorAttr.value || colorAttr.attribute_option?.value || "N/A";
    }

    return `Variation ID: ${variation.id || variation.variation_id || "N/A"}`;
  };

  return (
    <Modal className="modal orderReturn_modal" open={open} onClose={onClose}>
      <div className="modal-dialog">
        <div className="modal-body">
          <div className="btn-close" onClick={() => setOpen(false)}>
            <CloseIcon />
          </div>

          {step === 1 ? (
            <>
              <form className="form">
                <h2>Select item you want to exchange</h2>
                <RadioGroup
                  aria-labelledby="demo-item-label"
                  value={String(orderItemId)}
                  name="item"
                >
                  <FormControlLabel
                    value={String(orderItemId)}
                    control={<Radio />}
                    label={productName || "Product"}
                  />
                </RadioGroup>

                <h2>Select a reason for exchange</h2>
                <RadioGroup
                  aria-labelledby="demo-reason-label"
                  value={selectedReason}
                  onChange={handleReasonChange}
                  name="reason"
                >
                  {exchangeReasons.map((reasonOption) => (
                    <FormControlLabel
                      key={reasonOption.value}
                      value={reasonOption.value}
                      control={<Radio />}
                      label={reasonOption.label}
                      style={{ marginLeft: 0, marginRight: 0 }}
                    />
                  ))}
                </RadioGroup>
                {selectedReason === "other" && (
                  <TextField
                    label="Specify Reason"
                    variant="outlined"
                    fullWidth
                    hiddenLabel
                    multiline
                    rows={2}
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    sx={{ mt: 2 }}
                  />
                )}
              </form>

              <Button
                className="w_100 br_15"
                onClick={handleNext}
                style={{
                  backgroundColor: 'var(--commerce-primary)',
                  color: '#fff',
                  marginTop: '24px',
                  padding: '14px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  textTransform: 'none',
                }}
              >
                Next
              </Button>
            </>
          ) : (
            <>
              {isLoadingProduct ? (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                  <CircularProgress />
                </Box>
              ) : productError ? (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px" flexDirection="column" gap={2}>
                  <p>Failed to load product details. Please try again.</p>
                  <Button onClick={handleBack}>Go Back</Button>
                </Box>
              ) : (
                <>
                  {/* Product Details Card */}
                  <div style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '12px',
                    padding: '15px',
                    marginBottom: '20px',
                    backgroundColor: '#fff'
                  }}>
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                      <img
                        src={productImage}
                        alt={productName || "Product"}
                        style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold' }}>
                          {productName}
                        </h3>
                        <p style={{ margin: '4px 0', fontSize: '14px', color: '#666' }}>
                          Size: {productSize}
                        </p>
                        <p style={{ margin: '4px 0', fontSize: '14px', color: '#666' }}>
                          Qty: {productQuantity}
                        </p>
                        <p style={{ margin: '8px 0 0 0', fontSize: '16px', fontWeight: 'bold', color: 'var(--commerce-primary)' }}>
                          ₹{formatPriceInr(productPrice)}
                        </p>
                      </div>
                    </div>

                    {/* Delivery Address */}
                    {deliveryAddress && (
                      <>
                        <div style={{
                          borderTop: '1px solid #e0e0e0',
                          paddingTop: '15px',
                          marginTop: '15px',
                          display: 'flex',
                          gap: '10px',
                          alignItems: 'flex-start'
                        }}>
                          <img
                            src="/images/package_icon.svg"
                            alt="Delivery"
                            style={{ width: '20px', height: '20px', marginTop: '2px' }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <p style={{ margin: 0, fontSize: '14px', color: '#333', flex: 1 }}>
                            Delivering to {deliveryAddress}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Select New Size Section */}
                  <form className="form" style={{ marginTop: '20px' }}>
                    <h2>Select New Size</h2>
                    <div style={{
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      padding: '15px',
                      backgroundColor: '#fff'
                    }}>
                      {variations.length > 0 ? (
                        <RadioGroup
                          aria-labelledby="demo-variation-label"
                          value={selectedVariationId ? String(selectedVariationId) : ""}
                          onChange={(e) => setSelectedVariationId(Number(e.target.value))}
                          name="variation"
                          sx={{ '& .MuiFormControlLabel-root': { marginBottom: '12px' } }}
                        >
                          {variations.map((variation: any) => {
                            const variationId = variation.id || variation.variation_id;
                            const displayName = getVariationDisplayName(variation);
                            return (
                              <FormControlLabel
                                key={variationId}
                                value={String(variationId)}
                                control={<Radio sx={{ color: 'var(--commerce-primary)', '&.Mui-checked': { color: 'var(--commerce-primary)' } }} />}
                                label={
                                  <div style={{ fontWeight: 'bold' }}>{displayName}</div>
                                }
                              />
                            );
                          })}
                        </RadioGroup>
                      ) : (
                        <p style={{ color: '#666', fontSize: '14px' }}>No variations available for this product.</p>
                      )}
                    </div>
                  </form>

                  <div className="btn_flex" style={{ flexDirection: 'column', width: '100%' }}>
                    <Button
                      onClick={handleBack}
                      variant="outlined"
                      style={{
                        borderColor: 'var(--commerce-primary)',
                        color: 'var(--commerce-primary)',
                        backgroundColor: '#fff',
                        padding: '14px',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        fontSize: '16px',
                        textTransform: 'none',
                        flex: '1 1 0',
                        minWidth: 0,
                        width: '100%'
                      }}
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting || !selectedVariationId}
                      sx={{
                        backgroundColor: 'var(--commerce-primary)',
                        color: '#fff',
                        flex: '1 1 0',
                        minWidth: 0,
                        width: '100%',
                        padding: '14px',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        fontSize: '16px',
                        textTransform: 'none',
                        '&:hover': {
                          backgroundColor: 'var(--commerce-primary-hover)',
                        },
                        '&.Mui-disabled': {
                          backgroundColor: '#D9D9D9',
                          color: '#737373',
                          WebkitTextFillColor: '#737373',
                        },
                      }}
                    >
                      {isSubmitting ? "Submitting..." : "Submit Exchange Request"}
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
