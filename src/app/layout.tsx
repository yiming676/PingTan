import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "平潭二中移动校园",
  description: "平潭二中智慧校园管理系统 — 食堂报饭、设施报修、通知公告",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full bg-background-light text-text-main font-display">
        {children}
      </body>
    </html>
  )
}
