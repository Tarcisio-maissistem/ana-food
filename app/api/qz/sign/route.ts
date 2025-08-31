import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { data } = await request.json()

    if (!data) {
      return NextResponse.json({ error: "Dados não fornecidos" }, { status: 400 })
    }

    // URL da chave privada compartilhada no Google Drive
    const privateKeyUrl =
      "https://drive.usercontent.google.com/download?id=10YwamgHX5boyxXR2bSdMp1WocMxTcAP5&export=download&authuser=0"

    // Buscar a chave privada
    const response = await fetch(privateKeyUrl)
    const privateKey = await response.text()

    // Importar crypto para Node.js
    const crypto = await import("crypto")

    // Assinar os dados
    const sign = crypto.createSign("RSA-SHA256")
    sign.update(data)
    const signature = sign.sign(privateKey, "hex")

    return NextResponse.json({ signature })
  } catch (error) {
    console.error("[v0] Erro ao assinar dados QZ Tray:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
