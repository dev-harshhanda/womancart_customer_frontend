import ReferralClient from './ReferralClient';

export const dynamicParams = true;

export async function generateStaticParams() {
  // Return empty array for static export - dynamic routes will be handled client-side
  return [];
}

export default async function ReferralCodePage({ params }: { params: Promise<{ code: string }> }) {
  await params; // Await params but we'll get code from client-side
  return <ReferralClient />;
}
