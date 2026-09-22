import React from "react";

function ShippingReturns() {
  return (
    <>
      <div className="shipping_return">
        <div className="gap_p view_page">
          <div className="control_group">
            <h6>Shipping details</h6>
            <ul className="list">
              <li>
                <span>Estimated ship dimensions:</span>
                <span>
                  11 inches length x 8 inches width x 1 inches height
                </span>
              </li>
              <li>
                <span>Estimated ship weight:</span> <span>1 pounds</span>
              </li>
            </ul>
          </div>
          <div className="control_group">
            <h6>Return details</h6>
            <p>
              This item can be returned to any store or Herewegot.com . This
              item must be returned within 365 days of the date it was purchased
              in store, shipped, delivered by a Shipt shopper, or made ready for
              pickup. See the return policy for complete information.
            </p>
          </div>
        </div>
        <p className="report_product">
          <img src="/images/report_icon.svg" alt="icon" />
          Report an Issue with this product or seller to Fairu
        </p>
        <div className="tags">
          <span>Tags</span>
          <ul className="taglist">
            <li> #Sweater</li>
            <li> #Women’s Apperal</li>
            <li> #Clothing</li>
          </ul>
        </div>
      </div>
    </>
  );
}

export default ShippingReturns;
