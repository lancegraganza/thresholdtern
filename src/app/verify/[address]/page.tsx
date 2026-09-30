import { Verification } from '@/components/verification';
import { WalletProvider } from '@/components/wallet-provider';
import { AppProvider } from '@/components/provider';
export default async function Page({params,searchParams}: {params:Promise<{address:string}>;searchParams:Promise<{receipt?:string}>}){const {address}=await params,{receipt}=await searchParams;return <AppProvider><WalletProvider><Verification address={address} receiptId={receipt}/></WalletProvider></AppProvider>;}
