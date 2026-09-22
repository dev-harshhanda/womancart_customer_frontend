import React, { useState } from 'react'
interface NoDataFoundProps {
  image?: string;
  message?: string;
}

function NoDataFound({
  image = "/images/noDataRefined.png",
  message = "No Data Found",
}: NoDataFoundProps) {
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

export default NoDataFound