import { GateDetails } from "@/components/gate-details";
export default async function Page({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  return <GateDetails address={address} />;
}
