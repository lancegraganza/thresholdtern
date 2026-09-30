import { AppProvider } from '@/components/provider';
import { AppShell } from '@/components/app-shell';
export default function Layout({children}: {children:React.ReactNode}) { return <AppProvider><AppShell>{children}</AppShell></AppProvider>; }
