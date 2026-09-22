import {
  Dispatch,
  SetStateAction,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import CloseIcon from "@mui/icons-material/Close";
import LocalActivityOutlinedIcon from "@mui/icons-material/LocalActivityOutlined";
import {
  Button,
  CircularProgress,
  InputAdornment,
  Modal,
  TextField,
} from "@mui/material";

interface Coupon {
  id: number;
  code: string;
  promotion?: {
    name: string;
    description: string;
  };
  description?: string; // Fallback if promotion.description isn't available directly
  applicable?: boolean | null; // API flag: whether this coupon can be applied on current cart
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  setOpen: Dispatch<SetStateAction<boolean>>;
  couponList: Coupon[];
  activeCouponCode?: string;
  onApply: (code: string) => void;
  onRemove?: () => void;
  applyingCoupon?: boolean;
}

const EMPTY_FILTERED_COUPONS: Coupon[] = [];

/** Matches cart / ThemeFromStorage dynamic primary */
const THEME_PRIMARY =
  "var(--commerce-primary, #d91b76)" as const;
const PROMO_SEARCH_ROW_H = 44;

function couponMatchesQuery(promo: Coupon, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  const hay = [
    promo.code,
    promo.promotion?.name,
    promo.promotion?.description,
    promo.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}

export default function Promocode({
  open,
  onClose,
  setOpen,
  couponList,
  activeCouponCode,
  onApply,
  onRemove,
  applyingCoupon = false,
}: ModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const listPanelRef = useRef<HTMLDivElement>(null);
  const [listAreaMinPx, setListAreaMinPx] = useState<number | null>(null);

  useEffect(() => {
    if (open) setSearchQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) setListAreaMinPx(null);
  }, [open]);

  const filteredCoupons = useMemo(() => {
    const list = Array.isArray(couponList) ? couponList : [];
    const q = searchQuery.trim();
    if (!q) return list;
    const next = list.filter((p) => couponMatchesQuery(p, q));
    return next.length > 0 ? next : EMPTY_FILTERED_COUPONS;
  }, [couponList, searchQuery]);

  useLayoutEffect(() => {
    if (!open) return;
    const el = listPanelRef.current;
    if (!el || filteredCoupons.length === 0) return;
    const h = el.getBoundingClientRect().height;
    if (h > 0) setListAreaMinPx(Math.ceil(h));
  }, [open, filteredCoupons]);

  const handleManualApply = () => {
    const code = searchQuery.trim();
    if (!code || applyingCoupon) return;
    onApply(code);
  };

  const hasCoupons = Array.isArray(couponList) && couponList.length > 0;
  const isFilteredEmpty =
    hasCoupons &&
    filteredCoupons.length === 0 &&
    searchQuery.trim().length > 0;
  const useReservedEmptyLayout =
    isFilteredEmpty && listAreaMinPx != null && listAreaMinPx > 0;

  return (
    <>
      <Modal className="modal billing_summary_modal" open={open} onClose={onClose}>
        <div className="modal-dialog">
          <div className="modal-body">
            <div className="btn-close" onClick={() => setOpen(false)}>
              <CloseIcon />
            </div>
            <div className="modal_title d_block">
              <h2>Coupons</h2>
            </div>
            <div className="promocode_search_row form">
              <TextField
                className="promocode_search_field"
                fullWidth
                size="small"
                hiddenLabel
                placeholder="Search Promo Code"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleManualApply();
                  }
                }}
                // sx={{
                //   "& .MuiOutlinedInput-root": {
                //     height: PROMO_SEARCH_ROW_H,
                //     minHeight: PROMO_SEARCH_ROW_H,
                //     maxHeight: PROMO_SEARCH_ROW_H,
                //     alignItems: "center",
                //     borderRadius: "12px",
                //     backgroundColor: "#fff",
                //     "& fieldset": {
                //       borderColor: "rgba(29, 29, 29, 0.18)",
                //     },
                //     "&:hover fieldset": {
                //       borderColor: THEME_PRIMARY,
                //     },
                //     "&.Mui-focused fieldset": {
                //       borderWidth: 1,
                //       borderColor: THEME_PRIMARY,
                //     },
                //   },
                //   "& .MuiOutlinedInput-input": {
                //     py: 0,
                //     height: PROMO_SEARCH_ROW_H,
                //     boxSizing: "border-box",
                //     lineHeight: `${PROMO_SEARCH_ROW_H}px`,
                //   },
                //   // Extra spacing for the placeholder/text when an icon is present.
                //   "& .MuiInputBase-inputAdornedStart": {
                //     paddingLeft: "6px",
                //   },
                // }}
                slotProps={{
                  htmlInput: { spellCheck: false },
                  input: {
                    startAdornment: (
                      <InputAdornment
                        position="start"
                        className="promocode_search_adornment"
                      >
                        <LocalActivityOutlinedIcon
                          className="promocode_search_icon"
                          fontSize="small"
                          sx={{ color: THEME_PRIMARY }}
                          aria-hidden
                        />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <Button
                className=""
                disabled={!searchQuery.trim() || applyingCoupon}
                onClick={handleManualApply}
                sx={{
                  // height: PROMO_SEARCH_ROW_H,
                  // minHeight: PROMO_SEARCH_ROW_H,
                  // maxHeight: PROMO_SEARCH_ROW_H,
                  // alignSelf: "center",
                  // px: 2.25,
                  // borderRadius: "12px",
                  // boxSizing: "border-box",
                  // textTransform: "none",
                  // fontWeight: 600,
                  // backgroundColor: THEME_PRIMARY,
                  // color: "#fff",
                  // boxShadow: "none",
                  // "&:hover": {
                  //   backgroundColor: THEME_PRIMARY,
                  //   filter: "brightness(0.94)",
                  //   boxShadow: "none",
                  // },
                  "&.Mui-disabled": {
                    // backgroundColor: "rgba(0, 0, 0, 0.12)",
                    // color: "rgba(0, 0, 0, 0.34)",
                    // filter: "none",
                    opacity: ".5"
                  },
                }}
              >
                {applyingCoupon ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  "Apply"
                )}
              </Button>
            </div>
            <div
              ref={listPanelRef}
              className={`promocode_list_panel${useReservedEmptyLayout ? " promocode_list_panel--empty_filter" : ""}`}
              style={
                useReservedEmptyLayout
                  ? { minHeight: listAreaMinPx }
                  : undefined
              }
            >
              <ul className="promocd_lst">
                {filteredCoupons.length > 0
                  ? filteredCoupons.map((promo, index) => {
                      const isApplied =
                        activeCouponCode != null &&
                        promo.code != null &&
                        String(activeCouponCode).toLowerCase() ===
                          String(promo.code).toLowerCase();
                      const isNotApplicable = promo.applicable === false;
                      return (
                        <li key={promo.id ?? promo.code ?? index}>
                          <div>
                            <h3>{promo.code}</h3>
                            <Button
                              className="br_15"
                              onClick={() => {
                                if (isApplied && onRemove) {
                                  onRemove();
                                } else if (!isApplied && !isNotApplicable) {
                                  onApply(promo.code);
                                }
                              }}
                              disabled={
                                applyingCoupon ||
                                (isApplied && !onRemove) ||
                                isNotApplicable
                              }
                              sx={
                                isNotApplicable
                                  ? {
                                      borderColor: "#bdbdbd",
                                      color: "#757575",
                                      backgroundColor: "#f5f5f5",
                                      "&.Mui-disabled": {
                                        borderColor: "#bdbdbd !important",
                                        color: "#757575 !important",
                                        backgroundColor: "#f5f5f5 !important",
                                      },
                                    }
                                  : undefined
                              }
                            >
                              {isApplied
                                ? "Applied"
                                : isNotApplicable
                                  ? "Not applicable"
                                  : "Apply"}
                            </Button>
                          </div>
                          <p>
                            {promo.promotion?.description ||
                              promo.description ||
                              promo.promotion?.name ||
                              "No description available"}
                          </p>
                        </li>
                      );
                    })
                  : null}
              </ul>
              {isFilteredEmpty ? (
                <p className="promocode_empty_filter">No coupons match your search</p>
              ) : null}
              {hasCoupons ? null : (
                <p className="promocode_no_coupons">No coupons available</p>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
