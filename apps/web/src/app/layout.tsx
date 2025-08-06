import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    default: "Cultural Arbitrage Signal Engine",
    template: "%s | Cultural Arbitrage"
  },
  description: "Web3 trend intelligence platform that maps cultural vibes to crypto/NFT opportunities",
  keywords: ["web3", "crypto", "nft", "trends", "cultural-arbitrage", "intelligence"],
  authors: [{ name: "Cultural Arbitrage Team" }],
  creator: "Cultural Arbitrage Team",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://cultural-arbitrage.com",
    title: "Cultural Arbitrage Signal Engine",
    description: "Web3 trend intelligence platform that maps cultural vibes to crypto/NFT opportunities",
    siteName: "Cultural Arbitrage",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cultural Arbitrage Signal Engine",
    description: "Web3 trend intelligence platform that maps cultural vibes to crypto/NFT opportunities",
    creator: "@culturalarbitrage",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}