import type React from "react"
import type { Metadata } from "next"
import { Manrope, Open_Sans } from "next/font/google"
import "./globals.css"
import { ToastContainer } from "@/components/ui/toast"

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
})

const openSans = Open_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-open-sans",
})

export const metadata: Metadata = {
  title: "Ana Food - Sistema de Gerenciamento de Pedidos",
  description: "Sistema moderno para gerenciamento de pedidos em restaurantes",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`${manrope.variable} ${openSans.variable} antialiased`}>
      <body>
        {children}
        <ToastContainer />
      </body>
    </html>
  )
}
