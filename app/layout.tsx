import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
