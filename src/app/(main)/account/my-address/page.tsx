/* eslint-disable @next/next/no-img-element */
"use client";
import { Button, CircularProgress } from "@mui/material";
import React, { useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import { useRouter, useSearchParams } from "next/navigation";
import AddAddress from "@/modal/addAddress";
import { formatAddressPhone, buildFullPhone, normalizePhoneCode } from "@/utils/phoneNumber";
import { cacheAddressPhoneMeta } from "@/utils/addressPhoneCache";
import ConfirmModal from "@/modal/confirmModal";
import {
  useGetAddressListQuery,
  useDeleteAddressMutation,
  useEditAddressMutation,
} from "@/service/address";
import { Address } from "@/types/General";
import toast from "react-hot-toast";
import { useAppDispatch } from "@/lib/hook";
import emptySplitApi from "@/lib/rtk";
import {
  notifyDeliverySelectionChanged,
  persistDeliveryAddressIdForMode,
  setNormalDeliverHerePinned,
  writeSelectedLocationFromAddress,
} from "@/utils/deliveryAddressSync";
import { getSafeInternalReturnPath } from "@/utils/safeReturnPath";

function MyAddress() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open1, setOpen1] = useState(false);
  const [editData, setEditData] = useState<Address | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<number | null>(null);

  // Fetch address list
  const {
    data: addressResponse,
    isLoading,
    refetch,
  } = useGetAddressListQuery();

  const [deleteAddress] = useDeleteAddressMutation();
  const [editAddress, { isLoading: isSettingDefault }] = useEditAddressMutation();

  const addresses = addressResponse?.data || [];

  const handleCloseModal1 = () => {
    setOpen1(false);
    setEditData(null);
  };

  const handleAddNew = () => {
    setEditData(null);
    setOpen1(true);
  };

  const handleEdit = (address: Address) => {
    setEditData(address);
    setOpen1(true);
  };

  const handleDeleteClick = (id: number) => {
    if (deletingId) return; // Prevent multiple deletes at once
    setAddressToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!addressToDelete) return;

    setDeletingId(addressToDelete);
    setDeleteConfirmOpen(false);

    try {
      const response = await deleteAddress({ id: addressToDelete }).unwrap();
      toast.success(response?.message || "Address deleted successfully");
      refetch();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(
        error?.data?.message || error?.message || "Failed to delete address"
      );
    } finally {
      setDeletingId(null);
      setAddressToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setAddressToDelete(null);
  };

  const handleSuccess = () => {
    refetch();
  };

  const handleDeliverHere = (item: Address) => {
    persistDeliveryAddressIdForMode("normal", String(item.id));
    persistDeliveryAddressIdForMode("quick_delivery", String(item.id));
    setNormalDeliverHerePinned(true);
    writeSelectedLocationFromAddress(item);
    notifyDeliverySelectionChanged();
    dispatch(emptySplitApi.util.invalidateTags(["DASHBOARD", "CART"]));
    toast.success("Using this address for delivery");
    const back = getSafeInternalReturnPath(searchParams.get("returnTo"));
    if (back) {
      router.replace(back);
    }
  };

  const handleMakeDefault = async (item: Address) => {
    if (item.is_default === 1) return;
    try {
      const phoneCode = normalizePhoneCode(item.phone_code) || "91";
      const body = {
        name: item.name,
        mobile: item.mobile,
        phone: item.phone || buildFullPhone(phoneCode, item.mobile),
        email: item.email || "",
        address: item.address || "",
        address1: item.address1 || "",
        landmark: item.landmark || "",
        latitude: item.latitude || "0.0",
        longitude: item.longitude || "0.0",
        address_type: item.address_type || "Home",
        state: item.state || "",
        city: item.city || "",
        pincode: item.pincode || "",
        country_code: item.country_code || "IN",
        phone_code: `+${phoneCode}`,
        is_default: 1,
      };
      await editAddress({ id: item.id, body }).unwrap();
      cacheAddressPhoneMeta(item.id, {
        phone_code: phoneCode,
        country_code: item.country_code || "IN",
        phone: body.phone,
        mobile: item.mobile,
      });
      toast.success("Default address updated");
      setNormalDeliverHerePinned(false);
      persistDeliveryAddressIdForMode("normal", String(item.id));
      writeSelectedLocationFromAddress({ ...item, is_default: 1 });
      notifyDeliverySelectionChanged();
      dispatch(emptySplitApi.util.invalidateTags(["DASHBOARD", "CART"]));
      refetch();
    } catch (error: any) {
      toast.error(
        error?.data?.message || error?.message || "Failed to set default address"
      );
    }
  };

  const getAddressIcon = (type: string) => {
    const lowerType = type?.toLowerCase();
    if (lowerType === "home") {
      return "/images/address_icon.svg";
    } else if (lowerType === "office" || lowerType === "work") {
      return "/images/work.svg";
    }
    return "/images/address_icon.svg";
  };

  const formatAddress = (addr: Address): string => {
    const parts = [
      addr.address,
      addr.address1,
      addr.landmark,
      addr.city,
      addr.state,
      addr.pincode,
    ].filter(Boolean);
    return parts.join(", ");
  };

  return (
    <>
      <div className="s_head flex hd_6 ">
        <h2>Delivery Addresses</h2>
      </div>

      {isLoading ? (
        <>
          <p className="address_loading_text">Loading addresses...</p>
          <ul className="address_list">
            {Array.from({ length: 4 }).map((_, index) => (
              <li key={index} className="address_skeleton_item">
                <figure>
                  <div className="skeleton_shimmer address_skeleton_icon" />
                </figure>
                <div className="address_cnt hd_6">
                  <div className="skeleton_shimmer address_skeleton_type" />
                  <div className="skeleton_shimmer address_skeleton_line" />
                  <div className="skeleton_shimmer address_skeleton_line_short" />
                  <div className="skeleton_shimmer address_skeleton_contact" />
                </div>
                <div className="btn_group">
                  <div className="skeleton_shimmer address_skeleton_button" />
                  <div className="skeleton_shimmer address_skeleton_button" />
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : addresses.length === 0 ? (
        <div className="no_data" style={{ textAlign: "center", padding: "40px" }}>
          <p>No addresses found. Add your first delivery address!</p>
        </div>
      ) : (
        <ul className="address_list">
          {addresses.map((item: Address) => (
            <li key={item.id}>
              <figure>
                <img
                  src={getAddressIcon(item.address_type)}
                  alt={item.address_type || "icon"}
                />
              </figure>
              <div className="address_cnt hd_6">
                <h3>
                  {item.address_type?.toUpperCase() || "ADDRESS"}
                  {item.is_default === 1 && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#fff",
                        backgroundColor: "var(--commerce-primary, #d91b76)",
                        padding: "2px 8px",
                        borderRadius: 4,
                      }}
                    >
                      Default
                    </span>
                  )}
                </h3>
                <p>{formatAddress(item)}</p>
                {item.name && (
                  <p className="address_name">
                    <strong>{item.name}</strong> - {formatAddressPhone(item.phone, item.phone_code, item.mobile)}
                  </p>
                )}
                {item.email && <p className="address_email">{item.email}</p>}
              </div>
              <div className="btn_group">
                <Button
                  className="bordered_btn"
                  size="small"
                  onClick={() => handleDeliverHere(item)}
                  sx={{ mr: 0.5 }}
                >
                  Deliver here
                </Button>
                {item.is_default !== 1 && (
                  <Button
                    className="bordered_btn"
                    size="small"
                    onClick={() => handleMakeDefault(item)}
                    disabled={isSettingDefault}
                    sx={{ mr: 0.5 }}
                  >
                    {isSettingDefault ? "..." : "Make default"}
                  </Button>
                )}
                <Button
                  className="icon_btn"
                  onClick={() => handleEdit(item)}
                  disabled={deletingId === item.id}
                >
                  <img src="/images/edit_icon2.svg" alt="edit" />
                </Button>
                <Button
                  className="icon_btn"
                  onClick={() => handleDeleteClick(item.id)}
                  disabled={deletingId === item.id}
                >
                  {deletingId === item.id ? (
                    <CircularProgress size={20} />
                  ) : (
                    <img src="/images/trash_icon.svg" alt="delete" />
                  )}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="btn_group">
        <Button className="border_btn w_100" onClick={handleAddNew}>
          <AddIcon /> Add New Address
        </Button>
      </div>

      <AddAddress
        open={open1}
        onClose={handleCloseModal1}
        setOpen={setOpen1}
        editData={editData}
        onSuccess={handleSuccess}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={deleteConfirmOpen}
        onClose={handleDeleteCancel}
        setOpen={setDeleteConfirmOpen}
        title="Are you sure you want to delete this address?"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        isLoading={deletingId !== null}
      />
    </>
  );
}

export default MyAddress;
