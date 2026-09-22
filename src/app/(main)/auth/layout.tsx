/* eslint-disable @next/next/no-img-element */
"use client";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <section className="auth_sc ">
        <div className="auth_rt">{children}</div>
      </section>
    </>
  );
}
