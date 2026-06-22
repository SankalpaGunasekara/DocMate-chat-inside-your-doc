import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

/**
 * Hallmark · genre: modern-minimal · theme: cobalt
 * Display: Space Grotesk (geometric grotesque — technical, slightly quirky)
 * Body:    Inter Tight (allowed body fallback for technical themes)
 *          — we use Inter here as the closest free sibling to Inter Tight
 *          since next/font doesn't ship Inter Tight via Google Fonts.
 * Mono:    JetBrains Mono (engineering mono, ligatures)
 */
const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "DocMate — chat inside your doc",
  description:
    "A Google Docs-style snippet where you chat with an AI assistant and it writes formatted content straight into the document you have open.",
  keywords: ["DocMate", "AI docs", "OpenRouter", "Next.js", "TypeScript"],
  authors: [{ name: "DocMate" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <SonnerToaster richColors position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
