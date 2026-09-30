import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title:'ThresholdTern — private eligibility', description:'Prove the requirement. Keep the details private. Private threshold proofs on Midnight.' };
export default function RootLayout({children}: {children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
