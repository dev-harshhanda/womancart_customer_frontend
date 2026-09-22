/* eslint-disable @next/next/no-img-element */
"use client"
import { Button } from '@mui/material'
import React, { useState, useMemo } from 'react'
import AddIcon from '@mui/icons-material/Add';

import AddCardModal from "@/modal/addCardModal";
import ConfirmModal from "@/modal/confirmModal";
import toast from "react-hot-toast";
import { useRazorpay } from "@/hooks/useRazorpay";
import { useGetPaymentMethodsQuery, useDeletePaymentMethodMutation, useSaveCardPaymentMutation, useVerifyCardPaymentMutation } from "@/service/payment";
import { getFromStorage } from "@/constants/storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import { RAZORPAY_KEY_ID } from "@/constants/constants";

function PayementList() {
  const [open1, setOpen1] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [paymentMethodToDelete, setPaymentMethodToDelete] = useState<any>(null);
  const [isAddingCard, setIsAddingCard] = useState(false);
  
  const { openPayment } = useRazorpay();
  const { data: paymentMethodsData, isLoading, refetch: refetchPaymentMethods } = useGetPaymentMethodsQuery();
  const [deletePaymentMethod, { isLoading: isDeleting }] = useDeletePaymentMethodMutation();
  const [saveCardPayment] = useSaveCardPaymentMutation();
  const [verifyCardPayment] = useVerifyCardPaymentMutation();
  
  const paymentMethods = paymentMethodsData?.data || [];

  const prefillDetails = useMemo(() => {
    const userDataFromStorage = getFromStorage(STORAGE_KEYS.credentials);
    if (!userDataFromStorage) {
      return { name: "", email: "", contact: "" };
    }
    try {
      const credentials = JSON.parse(userDataFromStorage);
      return {
        name: credentials?.name || credentials?.full_name || "",
        email: credentials?.email || "",
        contact: credentials?.phoneNumber || credentials?.phone || "",
      };
    } catch {
      return { name: "", email: "", contact: "" };
    }
  }, []);

  const handleCloseModal1 = () => {
    setOpen1(false);
  };

  const handleAddNewCard = async () => {
    setIsAddingCard(true);
    try {
      // Step 1: Call save-card-payment to get the order_id
      const response = await saveCardPayment().unwrap();

      // Log the response for debugging

      // Try multiple possible locations for the order_id
      const paymentData = (response as any)?.data?.payment || (response as any)?.payment || (response as any)?.data;
      const orderId =
        paymentData?.razorpay_order_id ||
        paymentData?.order_id ||
        (response as any)?.data?.razorpay_order_id ||
        (response as any)?.razorpay_order_id ||
        (response as any)?.data?.transaction?.reference_id ||
        (response as any)?.data?.order_id;

      const keyId =
        paymentData?.key_id ||
        (response as any)?.data?.key_id ||
        RAZORPAY_KEY_ID;
      
      const amountValue = Number(
        paymentData?.amount || 
        (response as any)?.data?.amount || 
        1
      ); // Default to 1 if not provided
      
      const currency = 
        paymentData?.currency || 
        (response as any)?.data?.currency || 
        "INR";


      if (!orderId) {
        console.error("Order ID not found in response:", response);
        toast.error(
          response?.message || 
          "Failed to create payment order. Please try again."
        );
        setIsAddingCard(false);
        return;
      }

      // Step 2: Open Razorpay payment gateway
      const options = {
        key: keyId,
        amount: Math.round(amountValue * 100),
        currency,
        name: "Womancart",
        description: "Save Card",
        image: "/images/logo.png",
        order_id: orderId,
        handler: async (response: any) => {
          try {
            // Step 3: Verify the card payment
            const verifyResponse = await verifyCardPayment({
              razorpay_order_id: response?.razorpay_order_id || orderId,
              razorpay_payment_id: response?.razorpay_payment_id,
              razorpay_signature: response?.razorpay_signature,
            }).unwrap();

            if (verifyResponse?.success === true || verifyResponse?.statusCode === 200) {
              toast.success(
                verifyResponse?.message || "Card saved successfully"
              );
              refetchPaymentMethods();
            } else {
              toast.error(
                verifyResponse?.message || "Card verification failed"
              );
            }
          } catch (error: any) {
            toast.error(
              error?.data?.message ||
                error?.message ||
                "Card verification failed. Please try again."
            );
          } finally {
            setIsAddingCard(false);
          }
        },
        prefill: prefillDetails,
        notes: {
          action: "save_card",
        },
        theme: {
          color:
            getComputedStyle(document.documentElement)
              .getPropertyValue("--commerce-primary")
              .trim() || "#E91E63",
        },
        modal: {
          ondismiss: () => {
            setIsAddingCard(false);
          },
        },
      };

      openPayment(options);
    } catch (error: any) {
      console.error("Save Card Payment Error:", error);
      const errorMessage = 
        error?.data?.message ||
        error?.data?.errors?.[0]?.message ||
        error?.message ||
        "Failed to initiate card save. Please try again.";
      toast.error(errorMessage);
      setIsAddingCard(false);
    }
  };

  const handleDeletePaymentMethod = (paymentMethod: any) => {
    setPaymentMethodToDelete(paymentMethod);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!paymentMethodToDelete) return;

    const paymentMethodId = paymentMethodToDelete.id || paymentMethodToDelete._id;
    
    if (!paymentMethodId) {
      toast.error("Payment method ID not found");
      setDeleteConfirmOpen(false);
      setPaymentMethodToDelete(null);
      return;
    }

    try {
      await deletePaymentMethod({ id: paymentMethodId }).unwrap();
      toast.success("Payment method deleted successfully");
      setDeleteConfirmOpen(false);
      setPaymentMethodToDelete(null);
    } catch (error: any) {
      const errorMessage = error?.data?.message || error?.message || "Failed to delete payment method";
      toast.error(errorMessage);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setPaymentMethodToDelete(null);
  };

  const handleCardSaveSuccess = () => {
    // Refetch payment methods to show the newly added card
    refetchPaymentMethods();
  };

  const formatCardNumber = (paymentMethod: any) => {
    // Debug: Log the payment method to see what fields are available
    if (process.env.NODE_ENV === 'development') {
    }
    
    // Try different possible field names for last 4 digits
    const lastFour = 
      paymentMethod?.last_four || 
      paymentMethod?.lastFour || 
      paymentMethod?.last4 || 
      paymentMethod?.card_last_four ||
      paymentMethod?.cardLastFour ||
      paymentMethod?.last_four_digits;
    
    if (lastFour) {
      // Ensure it's a string and get last 4 characters
      const last4 = String(lastFour).slice(-4).padStart(4, '0');
      if (last4.length === 4) {
        return `XXXX XXXX XXXX ${last4}`;
      }
    }
    
    // Try to extract from full card number
    const cardNumber = 
      paymentMethod?.card_number || 
      paymentMethod?.cardNumber || 
      paymentMethod?.number ||
      paymentMethod?.masked_card_number;
    
    if (cardNumber) {
      const cleaned = String(cardNumber).replace(/\s/g, '').replace(/X/g, '');
      // If it contains X's, try to find the last 4 digits after X's
      if (cleaned.includes('X')) {
        const match = cleaned.match(/(\d{4})$/);
        if (match) {
          return `XXXX XXXX XXXX ${match[1]}`;
        }
      }
      // Extract last 4 digits from the number
      if (cleaned.length >= 4) {
        const last4 = cleaned.slice(-4);
        return `XXXX XXXX XXXX ${last4}`;
      }
    }
    
    return "XXXX XXXX XXXX XXXX";
  };

  const formatExpiryDate = (expiryMonth?: string, expiryYear?: string, expiryDate?: string) => {
    if (expiryDate) {
      return expiryDate;
    }
    if (expiryMonth && expiryYear) {
      const month = expiryMonth.padStart(2, '0');
      const year = expiryYear.length === 4 ? expiryYear.slice(-2) : expiryYear;
      return `${month}/${year}`;
    }
    return "MM/YY";
  };

  const getCardType = (paymentMethod: any) => {
    return paymentMethod?.type || paymentMethod?.card_type || "Personal";
  };

  if (isLoading) {
    return (
      <>
        <div className="s_head flex hd_6 ">
          <h2>Payment Cards</h2>
        </div>
        <ul className="payment_list">
          {[1, 2, 3].map((index) => (
            <li key={index} style={{ opacity: 0.6 }}>
              <figure>
                <img src="/images/payment_card.png" alt="card" />
              </figure>
              <div className="payment_cnt hd_6">
                <h3>Loading...</h3>
                <p>Loading...</p>
              </div>
            </li>
          ))}
        </ul>
      </>
    );
  }

  return (
    <>
      <div className="s_head flex hd_6 ">
        <h2>Payment Cards</h2>
      </div>
      {paymentMethods.length > 0 ? (
        <ul className="payment_list">
          {paymentMethods.map((paymentMethod, index) => {
            const isDefault = paymentMethod.is_default || false;
            const cardNumber = formatCardNumber(paymentMethod);
            const expiryDate = formatExpiryDate(
              paymentMethod.expiry_month,
              paymentMethod.expiry_year,
              paymentMethod.expiry_date
            );
            const cardType = getCardType(paymentMethod);

            return (
              <li key={paymentMethod.id || paymentMethod._id || index}>
                <figure>
                  <img src="/images/payment_card.png" alt="card" />
                </figure>

                <div className="payment_cnt hd_6">
                  <h3>{cardNumber}</h3>
                  <p>{cardType} - {expiryDate}</p>
                </div>

                <div className="btn_group">
                  {isDefault ? (
                    <p className="active">
                      Default <span></span>
                    </p>
                  ) : (
                    <p>Default</p>
                  )}

                  <Button 
                    className="icon_btn" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePaymentMethod(paymentMethod);
                    }}
                    disabled={isDeleting}
                  >
                    <img src="/images/trash_icon.svg" alt="delete" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div style={{ padding: "20px", textAlign: "center" }}>
          <p>No payment methods found. Add your first card to get started.</p>
        </div>
      )}
      <div className="btn_group payment_btn mt_20">
        <Button 
          className='br_15' 
          onClick={handleAddNewCard}
          disabled={isAddingCard}
        >
          <AddIcon /> {isAddingCard ? "Processing..." : "Add New Card"}
        </Button>
      </div>

      <AddCardModal 
        open={open1} 
        onClose={handleCloseModal1} 
        setOpen={setOpen1}
        onCardSaveSuccess={handleCardSaveSuccess}
      />

      <ConfirmModal
        open={deleteConfirmOpen}
        onClose={handleCancelDelete}
        setOpen={setDeleteConfirmOpen}
        title="Are you sure you want to delete this payment method?"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />
    </>
  )
}

export default PayementList;
