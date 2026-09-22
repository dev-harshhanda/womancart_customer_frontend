import React from 'react'
interface WebFeatureProps {
  className?: string;
}

const HomeFeature: React.FC<WebFeatureProps> = ({ className }) => {
  const features = [
    {
      icon: "/images/feature_icon.svg",
      title: "Best Prices & Deals",
      desc: "Don’t miss our daily amazing deals and prices",
    },
    {
      icon: "/images/feature_icon2.svg",
      title: "Refundable ",
      desc: "If your items have damage we agree to refund it",
    },
    {
      icon: "/images/feature_icon3.svg",
      title: "100% Genuine Products",
      desc: "Shop authentic beauty, fashion & lifestyle brands with confidence.",
    },
  ];
  return (
    <>
      <section className={`web-feature ${className ? className : ""}`}>
        <div className="container">
          <ul className="web_feature hd_5 ">
            {features.map((feature, index) => (
              <li key={index}>
                <figure>
                  <span
                    className="icon_theme_primary"
                    style={{
                      WebkitMaskImage: `url(${feature.icon})`,
                      maskImage: `url(${feature.icon})`,
                      ['--icon-size' as string]: "32px",
                    }}
                    aria-hidden
                  />
                </figure>
                <div className="feature_cnt">
                  <h3 className='fw_semi_bold'>{feature.title}</h3>
                  <p>{feature.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}

export default HomeFeature