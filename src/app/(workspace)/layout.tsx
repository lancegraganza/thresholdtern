import { AppProvider } from '@/components/provider';
import { AppShell } from '@/components/app-shell';
import { WalletProvider } from '@/components/wallet-provider';
export default function Layout({children}: {children:React.ReactNode}) { return <AppProvider><WalletProvider><AppShell>{children}</AppShell></WalletProvider></AppProvider>; }
