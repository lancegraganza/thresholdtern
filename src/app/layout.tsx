import type { Metadata } from "next";
import "./globals.css";
import "@fontsource-variable/manrope";
import "@fontsource-variable/space-grotesk";
import { AppProvider } from "@/components/provider";
import { WalletProvider } from "@/components/wallet-provider";
export const metadata: Metadata = {
  title: "ThresholdTern — private eligibility",
  description:
    "Prove the requirement. Keep the details private. Private threshold proofs on Midnight.",
  icons: { icon: "/logo-app.png", apple: "/logo-app.png" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <WalletProvider>{children}</WalletProvider>
        </AppProvider>
      </body>
    </html>
  );
}
