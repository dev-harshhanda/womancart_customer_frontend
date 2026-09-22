"use client";

import React from "react";
import { useRouter } from "next/navigation";

interface Crumb {
  label: string;
  path?: string;
}

interface BredCrumProps {
  items: Crumb[];
}

function BredCrum({ items }: BredCrumProps) {
  const router = useRouter();
  return (
    <>
      <ul className="bredcrum_list">
        {items.map((item, index) => (
          <li
            key={index}
            className={item.path ? "cursor_pointer" : ""}
            onClick={() => item.path && router.push(item.path)}
          >
            {index === 0 && <img src="/images/home_icon.svg" alt="icon" />}
            {item.label}
          </li>
        ))}
      </ul>
    </>
  );
}

export default BredCrum;
