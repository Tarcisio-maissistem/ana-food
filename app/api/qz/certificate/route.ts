import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Servindo certificado compartilhado...")

    const certUrl =
      "https://drive.usercontent.google.com/download?id=1OOb9Hojrnpc0lWQtHNKizbQ-1_1xJIY2&export=download&authuser=0&confirm=t&uuid=6d6d36b5-01be-4b99-a9e8-e6a577a9b565&at=AN8xHopzBVySvQPs2-LGoBEgaU0D:1756612232082"

    const response = await fetch(certUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "*/*",
      },
    })

    if (!response.ok) {
      console.error("[v0] Erro ao buscar certificado do Google Drive:", response.status)
      throw new Error(`Erro ao buscar certificado: ${response.status}`)
    }

    const certificateBuffer = await response.arrayBuffer()

    return new NextResponse(certificateBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/x-pkcs12",
        "Content-Disposition": "attachment; filename=qz-shared-cert.p12",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    console.error("[v0] Erro na API de certificado:", error)
    return NextResponse.json({ error: "Erro ao servir certificado compartilhado" }, { status: 500 })
  }
}
