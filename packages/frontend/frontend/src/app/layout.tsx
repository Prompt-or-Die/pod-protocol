import { Toaster } from "react-hot-toast";
import { WalletProvider } from "../components/providers/WalletProvider";
import { PerformanceProvider } from "../components/performance/PerformanceProvider";
import { SecurityProvider } from "../components/security/SecurityProvider";
import { BetaTestingProvider } from "../components/testing/BetaTestingProvider";
import { Metadata } from "next";
import { inter, jetbrainsMono, orbitron } from "../lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "PoD Protocol - Prompt or Die",
  description: "The ultimate AI Agent Communication Protocol on Solana. Where code becomes consciousness.",
  keywords: ["AI", "Solana", "Blockchain", "Agents", "Communication", "Protocol", "Web3"],
  authors: [{ name: "PoD Protocol Team" }],
  creator: "PoD Protocol",
  publisher: "PoD Protocol",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://pod-protocol.com"),
  openGraph: {
    title: "PoD Protocol - Prompt or Die",
    description: "The ultimate AI Agent Communication Protocol on Solana",
    url: "https://pod-protocol.com",
    siteName: "PoD Protocol",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PoD Protocol - AI Agent Communication",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PoD Protocol - Prompt or Die",
    description: "The ultimate AI Agent Communication Protocol on Solana",
    images: ["/og-image.png"],
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
  verification: {
    google: "your-google-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#6B46C1" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${orbitron.variable} antialiased min-h-screen bg-gradient-to-br from-pod-bg-darker to-pod-bg-dark text-pod-text-light`}
      >
        <div className="relative min-h-screen">
          {/* Matrix background effect */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-pod-bg-darker via-pod-bg-dark to-pod-bg-darker opacity-90" />
            <div className="absolute inset-0">
              {/* Animated background particles */}
              <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-pod-violet rounded-full opacity-20 animate-pulse" />
              <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-pod-violet-light rounded-full opacity-30 animate-pulse" style={{ animationDelay: "1s" }} />
              <div className="absolute top-1/2 left-3/4 w-1.5 h-1.5 bg-pod-accent rounded-full opacity-25 animate-pulse" style={{ animationDelay: "2s" }} />
            </div>
          </div>
          
          {/* Main content */}
          <div className="relative z-10">
            <SecurityProvider>
              <PerformanceProvider>
                <BetaTestingProvider enableFeedbackWidget={true}>
                  <WalletProvider>
                    {children}
                  </WalletProvider>
                </BetaTestingProvider>
              </PerformanceProvider>
            </SecurityProvider>
          </div>
        </div>
        
        {/* Toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "rgba(15, 15, 35, 0.9)",
              color: "#F8FAFC",
              border: "1px solid rgba(107, 70, 193, 0.3)",
              backdropFilter: "blur(10px)",
            },
            success: {
              iconTheme: {
                primary: "#10B981",
                secondary: "#F8FAFC",
              },
            },
            error: {
              iconTheme: {
                primary: "#EF4444",
                secondary: "#F8FAFC",
              },
            },
          }}
        />
      </body>
    </html>
  );
}
