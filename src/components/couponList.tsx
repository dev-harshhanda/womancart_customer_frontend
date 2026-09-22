import React from 'react'
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

type CouponListProps = {
  className?: string;
  statusText?: string; // 👈 new prop
};

const CouponList: React.FC<CouponListProps> = ({ className, statusText }) => {
  return (
    <div className="gap_m coupon_list ">
      {Array.from({ length: 3 }).map((_, index) => (
        <div className={`coupon_bx ${className || ""}`} key={index}>
          <p>{statusText || `Expires on 01 Sep 2025`}</p>
          <h2>{30 + index * 5}%off</h2>
          <p>Maximum Cashback limit is {200 + index * 50} AED</p>
          <div className="coupon_footer">
            <span className="tag">SPORTS{30 + index * 5}</span>
            <ContentCopyIcon />
          </div>
        </div>
      ))}
    </div>
  )
}

export default CouponList;
