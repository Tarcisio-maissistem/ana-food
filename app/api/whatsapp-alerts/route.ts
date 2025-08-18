import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  try {
    const { data: alerts, error } = await supabase
      .from("whatsapp_alerts")
      .select("*")
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) {
      console.error("Erro ao buscar alertas:", error)
      return NextResponse.json([], { status: 200 })
    }

    return NextResponse.json(alerts || [])
  } catch (error) {
    console.error("Erro na API de alertas:", error)
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customer_name, phone, message, order_id } = body

    const { data, error } = await supabase
      .from("whatsapp_alerts")
      .insert([{ customer_name, phone, message, order_id }])
      .select()

    if (error) {
      console.error("Erro ao criar alerta:", error)
      return NextResponse.json({ error: "Erro ao criar alerta" }, { status: 500 })
    }

    return NextResponse.json(data[0])
  } catch (error) {
    console.error("Erro na API de alertas:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, is_read } = body

    const { data, error } = await supabase
      .from("whatsapp_alerts")
      .update({ is_read, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()

    if (error) {
      console.error("Erro ao atualizar alerta:", error)
      return NextResponse.json({ error: "Erro ao atualizar alerta" }, { status: 500 })
    }

    return NextResponse.json(data[0])
  } catch (error) {
    console.error("Erro na API de alertas:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
