import { Verification } from "@/components/verification";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ address: string }>;
  searchParams: Promise<{ receipt?: string }>;
}) {
  const { address } = await params,
    { receipt } = await searchParams;
  return <Verification address={address} receiptId={receipt} />;
}
