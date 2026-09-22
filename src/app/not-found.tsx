/* eslint-disable react/no-unescaped-entities */
"use client"
import { Button } from "@mui/material";
import { usePathname, useRouter } from "next/navigation";

export default function Custom404() {

  const router = useRouter();
  const pathname = usePathname();

  return (
    <>
      <section className="error_page page_404 u_spc">
        <div className="container">
          <h1>404</h1>
          <h2>OOPS! Page not found</h2>
          <p>We couldn't find that page, but check out our homepage or search for something else.</p>
          <Button
            color="info"
            variant="outlined"
            onClick={() => {
              if (pathname.startsWith("/employee")) {
                router.push("/employee/dashboard");
              } else if (pathname.startsWith("/employer")) {
                router.push("/employer/dashboard");
              } else {
                router.push("/");
              }
            }}
          >
            GO TO HOME
          </Button>
        </div>
      </section>
    </>
  );
}