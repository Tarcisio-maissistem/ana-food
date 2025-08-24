import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const userEmail = request.headers.get("x-user-email") || "tarcisiorp16@gmail.com"

    // Buscar usuário
    const { data: user } = await supabase.from("users").select("id").eq("email", userEmail).single()

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    // Buscar empresa do usuário
    const { data: company } = await supabase.from("companies").select("id").eq("user_id", user.id).single()

    if (!company) {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })
    }

    // Buscar bairros de entrega
    const { data: zones, error } = await supabase
      .from("delivery_zones")
      .select("*")
      .eq("company_id", company.id)
      .order("zone")

    if (error) {
      console.error("Erro ao buscar bairros:", error)
      return NextResponse.json({ error: "Erro ao buscar bairros" }, { status: 500 })
    }

    return NextResponse.json(zones || [])
  } catch (error) {
    console.error("Erro na API delivery-zones:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userEmail = request.headers.get("x-user-email") || "tarcisiorp16@gmail.com"
    const body = await request.json()

    // Buscar usuário
    const { data: user } = await supabase.from("users").select("id").eq("email", userEmail).single()

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    // Buscar empresa do usuário
    const { data: company } = await supabase.from("companies").select("id").eq("user_id", user.id).single()

    if (!company) {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })
    }

    // Criar bairro de entrega
    const { data: zone, error } = await supabase
      .from("delivery_zones")
      .insert({
        company_id: company.id,
        zone: body.zone,
        price: body.price,
        active: body.active,
      })
      .select()
      .single()

    if (error) {
      console.error("Erro ao criar bairro:", error)
      return NextResponse.json({ error: "Erro ao criar bairro" }, { status: 500 })
    }

    return NextResponse.json(zone)
  } catch (error) {
    console.error("Erro na API delivery-zones POST:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
