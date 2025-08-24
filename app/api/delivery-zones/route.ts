import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const userEmail = request.headers.get("x-user-email") || "tarcisiorp16@gmail.com"
    console.log("[v0] Delivery Zones API: Buscando bairros para usuário:", userEmail)

    // Buscar usuário
    const { data: user, error: userError } = await supabase.from("users").select("id").eq("email", userEmail).single()
    console.log("[v0] Delivery Zones API: Usuário encontrado:", user?.id, "Erro:", userError)

    if (!user) {
      console.log("[v0] Delivery Zones API: Usuário não encontrado")
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    // Buscar empresa do usuário
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id")
      .eq("user_id", user.id)
      .single()
    console.log("[v0] Delivery Zones API: Empresa encontrada:", company?.id, "Erro:", companyError)

    if (!company) {
      console.log("[v0] Delivery Zones API: Empresa não encontrada")
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })
    }

    // Verificar se a tabela delivery_zones existe
    const { data: tableCheck, error: tableError } = await supabase.rpc("check_table_exists", {
      table_name: "delivery_zones",
    })
    console.log("[v0] Delivery Zones API: Tabela delivery_zones existe:", tableCheck, "Erro:", tableError)

    // Buscar bairros de entrega
    console.log("[v0] Delivery Zones API: Buscando bairros para company_id:", company.id)
    const { data: zones, error } = await supabase
      .from("delivery_zones")
      .select("*")
      .eq("company_id", company.id)
      .order("zone")

    console.log("[v0] Delivery Zones API: Bairros encontrados:", zones?.length || 0, "Erro:", error)

    if (error) {
      console.error("[v0] Delivery Zones API: Erro ao buscar bairros:", error)
      return NextResponse.json({ error: "Erro ao buscar bairros" }, { status: 500 })
    }

    console.log("[v0] Delivery Zones API: Retornando", zones?.length || 0, "bairros")
    return NextResponse.json(zones || [])
  } catch (error) {
    console.error("[v0] Delivery Zones API: Erro na API delivery-zones:", error)
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
      console.error("[v0] Delivery Zones API: Erro ao criar bairro:", error)
      return NextResponse.json({ error: "Erro ao criar bairro" }, { status: 500 })
    }

    return NextResponse.json(zone)
  } catch (error) {
    console.error("[v0] Delivery Zones API: Erro na API delivery-zones POST:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
