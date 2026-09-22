import { Button } from '@mui/material'
import { useRouter } from 'next/navigation'
import React from 'react'
import { useNavigateWithDeliveryMode } from '@/hooks/useNavigateWithDeliveryMode'

function HomeCTA() {

  const { navigate } = useNavigateWithDeliveryMode();
  
  return (
    <>
      <section className='retailer_sc u_spc'>
        <div className="container text_center">
          <h2>Elevate Your Everyday Style</h2>
          <p>Shop fashion, beauty, and wellness picks curated just for you.</p>
          <Button onClick={() => navigate("/product/product-category?type=explore")}>Explore Now</Button>
        </div>
      </section>
    </>
  )
}

export default HomeCTA