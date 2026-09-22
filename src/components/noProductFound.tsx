import React, { useState } from 'react'
interface NoProductFoundProps {
  image?: string;
  message?: string;
}

function NoProductFound({
  image = "/images/noDataRefined.png",
  message = "No products found.",
}: NoProductFoundProps) {
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

export default NoProductFound