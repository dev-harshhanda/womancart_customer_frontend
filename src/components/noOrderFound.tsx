import React, { useState } from 'react'
interface NoOrderFoundProps {
  image?: string;
  message?: string;
}

function NoOrderFound({
  image = "/images/noDataRefined.png",
  message = "No orders found.",
}: NoOrderFoundProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="no_data_found">
      {!imageError && image ? (
        <figure>
          <img
            src={image}
            alt="no data"
            onError={() => {
              console.log("Image failed to load:", image);
              setImageError(true);
            }}
          />
        </figure>
      ) : (
        <p>{message}</p>
      )}
    </div>
  )
}

export default NoOrderFound