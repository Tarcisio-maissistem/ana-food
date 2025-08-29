import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"

const SECRET_KEY = "286E68A687F9C4874FEBD75EFD83E" // Same key as the certificate API

export async function POST(request: NextRequest) {
  try {
    const { company_id } = await request.json()

    if (!company_id) {
      return NextResponse.json({ error: "CNPJ da empresa é obrigatório" }, { status: 400 })
    }

    // TODO: Verify if company exists and belongs to user
    // const company = await getCompanyByCNPJ(company_id)
    // if (!company) {
    //   return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    // }

    // Generate token with 1 hour expiration
    const token = jwt.sign({ company_id }, SECRET_KEY, { expiresIn: "1h" })

    return NextResponse.json({ token })
  } catch (error) {
    console.error("Erro ao gerar token:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
