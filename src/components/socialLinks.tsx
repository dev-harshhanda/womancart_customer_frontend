import React from 'react'

const socialLinks = [
  { href: "https://www.facebook.com/womancart.in/", icon: "/images/facebook_icon.svg", label: "Facebook" },
  { href: "https://www.youtube.com/channel/UCDevpbzrK01BFDgxiV2Kz4g", icon: "/images/youtube_icon.svg", label: "YouTube" },
  { href: "https://www.instagram.com/womancart.in/", icon: "/images/insta_icon.svg", label: "Instagram" },
  { href: "https://www.linkedin.com/company/womancart-in/", icon: "/images/linkedin_icon.svg", label: "LinkedIn" },
];

function SocialLinks() {
  return (
    <>
      <ul className="social_links">
        {socialLinks.map((item, index) => (
          <li key={index}>
            <a href={item.href} target="_blank" rel="noopener noreferrer" aria-label={item.label}>
              <span
                className="icon_theme_primary"
                style={{
                  WebkitMaskImage: `url(${item.icon})`,
                  maskImage: `url(${item.icon})`,
                  ['--icon-size' as string]: "32px",
                }}
                aria-hidden
              />
            </a>
          </li>
        ))}
      </ul>
    </>
  )
}

export default SocialLinks