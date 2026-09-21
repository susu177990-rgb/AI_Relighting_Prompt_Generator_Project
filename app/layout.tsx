import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 重打光提示词生成器",
  description: "根据光位、光质、色温、光比与氛围参数，实时生成严格保护原图结构的专业重打光提示词。",
  other: { "codex-preview": "development" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
