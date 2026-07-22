import type { Metadata } from "next";
import "./globals.css";
import "./systems.css";
import "./director.css";
import "./accessibility.css";
import "./mobile.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://fable-six-unwritten.erikalpysbaev30.chatgpt.site"),
  title: "Hollow Vault — Rift Protocol",
  description: "A room-crawling bullet roguelite with distinct monsters, weapon swapping, relic builds, and boss encounters.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Hollow Vault — Rift Protocol",
    description: "Descend, adapt, and survive a shifting monster vault.",
    images: [{ url: "/og.png", width: 1672, height: 941, alt: "Hollow Vault — Rift Protocol" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export const viewport={width:"device-width",initialScale:1,viewportFit:"cover",themeColor:"#090813"};

export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
