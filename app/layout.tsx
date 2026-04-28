import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { ThemeProvider } from "./providers";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://cassidycodes.vercel.app'),
  title: {
    default: 'cassidycodes',
    template: '%s | cassidycodes',
  },
  description: '개발 블로그 및 포트폴리오 - Articles, TIL, Reflections',
  keywords: ['개발', '블로그', '백엔드', '프레임워크', 'POJO', 'server', 'Spring', 'AOP', 'TIL'],
  authors: [{ name: 'yyubin' }],
  creator: 'yyubin',
  verification: {
    google: '6iFCG8C5YtndF74RxqC2sLqX6kFl2pRNPC_5i8dASn4',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://cassidycodes.vercel.app',
    title: 'cassidycodes',
    description: '개발 블로그 및 포트폴리오 - Articles, TIL, Reflections',
    siteName: 'cassidycodes',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'cassidycodes',
    description: '개발 블로그 및 포트폴리오 - Articles, TIL, Reflections',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css"
        />
      </head>
      <body
        className={`${jetbrainsMono.variable} antialiased`}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
