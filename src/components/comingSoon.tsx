import React from "react";

interface ComingSoonProps {
  image?: string;
  message?: string;
}

function ComingSoon({
  image = "/images/coming-soon.png",
  // message = "Coming Soon",
}: ComingSoonProps) {
  return (
    <div className="no_data_found">
      <figure>
        <img src={image} alt="coming soon" />
      </figure>
      {/* <p>{message}</p> */}
    </div>
  );
}

export default ComingSoon;
