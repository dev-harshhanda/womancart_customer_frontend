/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
import React from 'react'
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { useRouter } from 'next/navigation';
import { getBannerNavigationUrl } from "@/utils/bannerNavigation";

interface HomeLowestPriceProps {
  items?: any[];
  title?: string;
  showTitle?: boolean;
}

function HomeLowestPrice({ items = [], title = "Lowest Prices", showTitle = true }: HomeLowestPriceProps) {


  const router = useRouter();

  return (
    <>
      <section className="home_sale_sc">
        <div className="container">
          {showTitle ? (
            <div className="s_head flex hd_4">
              <h2 className='fw_med'>{title}</h2>
            </div>
          ) : null}
          <div className="sale_list gap_m">
            {items.map((item, index) => (
              <div
                key={`home-lowest-price-${item.id || 'no-id'}-${index}`}
                className="sale_item"
                onClick={() => router.push(getBannerNavigationUrl(item))}
              >
                <figure>
                  <img src={item.image} alt={item.title} />
                </figure>
                <h3 style={{
                  borderTopLeftRadius: '25px',
                  borderTopRightRadius: '25px',
                  borderBottomLeftRadius: '0px',
                  borderBottomRightRadius: '0px',
                  width: '98%',
                  marginLeft: '2%',
                }}>{item.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

export default HomeLowestPrice