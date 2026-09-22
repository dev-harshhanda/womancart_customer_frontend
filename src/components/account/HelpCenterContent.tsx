/* eslint-disable @next/next/no-img-element */
"use client";
import { Button, MenuItem, Select, TextField, Modal } from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import React from "react";
import toast from "react-hot-toast";
import { useSubmitHelpCenterMutation } from "@/service/cms";
import { formatApiMessage } from "@/utils/format";

const WHATSAPP_CHAT_URL = "https://wa.me/+919870109886";
const CUSTOMER_SERVICE_PHONE = "+91-9311866860";
const CUSTOMER_SERVICE_PHONE_TEL = "+919311866860";

export function HelpCenterContent({ pageTitle = "Help Center" }: { pageTitle?: string }) {
  const [showForm, setShowForm] = React.useState(false);
  const [showCallModal, setShowCallModal] = React.useState(false);
  const [formValues, setFormValues] = React.useState({
    Enquiry: 0,
    title: "",
    description: "",
  });
  const [submitHelpCenter, { isLoading }] = useSubmitHelpCenterMutation();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChange = (event: any) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleWriteToUsClick = () => {
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
  };

  const handleChatClick = () => {
    window.open(WHATSAPP_CHAT_URL, "_blank", "noopener,noreferrer");
  };

  const handleCallNowClick = () => {
    setShowCallModal(true);
  };

  const handleCloseCallModal = () => {
    setShowCallModal(false);
  };

  const handleCall = () => {
    window.location.href = `tel:${CUSTOMER_SERVICE_PHONE_TEL}`;
    setShowCallModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formValues.Enquiry === 0) {
      toast.error("Please select a reason for contact");
      return;
    }

    if (!formValues.title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (!formValues.description.trim()) {
      toast.error("Please enter a description");
      return;
    }

    const typeMap: Record<number, string> = {
      10: "payment",
      20: "other",
    };

    const type = typeMap[formValues.Enquiry] || "other";

    try {
      const response = await submitHelpCenter({
        type,
        subject: formValues.title.trim(),
        message: formValues.description.trim(),
      }).unwrap();

      if (response?.statusCode === 200) {
        toast.success(
          formatApiMessage(
            response?.message,
            "Your query has been submitted successfully. We will get back to you within 24–48 hours.",
          ),
        );
        setFormValues({
          Enquiry: 0,
          title: "",
          description: "",
        });
        setShowForm(false);
      } else {
        toast.error(
          formatApiMessage(response?.message, "Failed to submit query. Please try again."),
        );
      }
    } catch (error: any) {
      toast.error(
        formatApiMessage(
          error?.data?.message || error?.message,
          "Failed to submit query. Please try again.",
        ),
      );
    }
  };

  return (
    <>
      <div className="s_head flex hd_6 ">
        <h2>{pageTitle}</h2>
      </div>

      {showForm && (
        <>
          <div className="help_center_form_header btn_group payment_btn">
            <Button
              type="button"
              className="br_15"
              onClick={handleCloseForm}
              startIcon={<ArrowBackIosNewIcon sx={{ fontSize: 16 }} />}
            >
              Back
            </Button>
          </div>
          <form className="form help_center" onSubmit={handleSubmit}>
            <div className="gap_p">
              <div className="control_group w_50">
                <label>Reason for Contact</label>
                <Select
                  name="Enquiry"
                  value={formValues.Enquiry}
                  onChange={(e) => handleChange(e)}
                >
                  <MenuItem disabled value={0}>
                    Select Issue
                  </MenuItem>
                  <MenuItem value={10}>Payment Issue</MenuItem>
                  <MenuItem value={20}>Other</MenuItem>
                </Select>
              </div>

              <div className="control_group w_50">
                <label>Title</label>
                <TextField
                  fullWidth
                  hiddenLabel
                  placeholder="Enter here"
                  name="title"
                  value={formValues.title}
                  onChange={handleChange}
                />
              </div>
              <div className="control_group w_100">
                <label>Description</label>
                <TextField
                  fullWidth
                  hiddenLabel
                  placeholder="Type message here...."
                  multiline
                  minRows={4}
                  name="description"
                  value={formValues.description}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="btn_group payment_btn mt_20">
              <Button type="submit" className="br_15" disabled={isLoading}>
                {isLoading ? "SUBMITTING..." : "SUBMIT"}
              </Button>
            </div>
          </form>
        </>
      )}

      {!showForm && (
        <div className="contact_sc">
          <figure>
            <img src="/images/contact_vector.svg" alt="Icon" />
          </figure>

          <h2>Facing Any Issue?</h2>
          <p>Please get in touch and we will be happy to help you</p>

          <ul>
            <li onClick={handleChatClick} style={{ cursor: "pointer" }}>
              <figure>
                <span
                  className="icon_theme_primary"
                  style={{
                    WebkitMaskImage: "url(/images/calling_icon.svg)",
                    maskImage: "url(/images/calling_icon.svg)",
                  }}
                  aria-hidden
                />
              </figure>
              <p>
                <strong>Chat with Us</strong>
                <span>For a better experience, chat from your registered number</span>
              </p>
            </li>
            <li onClick={handleCallNowClick} style={{ cursor: "pointer" }}>
              <figure>
                <span
                  className="icon_theme_primary"
                  style={{
                    WebkitMaskImage: "url(/images/calling_icon.svg)",
                    maskImage: "url(/images/calling_icon.svg)",
                  }}
                  aria-hidden
                />
              </figure>
              <p>
                <strong>Call Now</strong>
                <span>{CUSTOMER_SERVICE_PHONE}</span>
              </p>
            </li>
            <li onClick={handleWriteToUsClick} style={{ cursor: "pointer" }}>
              <figure>
                <span
                  className="icon_theme_primary"
                  style={{
                    WebkitMaskImage: "url(/images/editing_icon.svg)",
                    maskImage: "url(/images/editing_icon.svg)",
                  }}
                  aria-hidden
                />
              </figure>
              <p>
                <strong>Write to Us</strong>
                <span>Average response time 24-48 Hrs</span>
              </p>
            </li>
          </ul>
        </div>
      )}

      <Modal className="modal" open={showCallModal} onClose={handleCloseCallModal}>
        <div className="modal-dialog">
          <div className="modal-body">
            <div
              className="btn_flex"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                marginTop: "20px",
              }}
            >
              <Button
                onClick={handleCall}
                className="br_15"
                style={{
                  backgroundColor: "#007AFF",
                  color: "#fff",
                  width: "100%",
                  padding: "12px",
                  fontSize: "16px",
                  fontWeight: 600,
                }}
              >
                Call {CUSTOMER_SERVICE_PHONE}
              </Button>
              <Button
                onClick={handleCloseCallModal}
                className="br_15"
                style={{
                  backgroundColor: "#6C6C6C",
                  color: "#fff",
                  width: "100%",
                  padding: "12px",
                  fontSize: "16px",
                  fontWeight: 600,
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
