import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const userEmail = request.headers.get("x-user-email")
    if (!userEmail) {
      return NextResponse.json({ error: "User email required" }, { status: 400 })
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, company_id")
      .eq("email", userEmail)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { data: settings, error } = await supabase
      .from("delivery_settings")
      .select("*")
      .eq("company_id", userData.company_id)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("[v0] API DeliverySettings: Erro ao buscar:", error)
      return NextResponse.json({ error: "Failed to fetch delivery settings" }, { status: 500 })
    }

    return NextResponse.json(settings || { delivery_mode: "neighborhoods", base_location: "" })
  } catch (error) {
    console.error("[v0] API DeliverySettings: Erro:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userEmail = request.headers.get("x-user-email")
    if (!userEmail) {
      return NextResponse.json({ error: "User email required" }, { status: 400 })
    }

    const body = await request.json()
    const { delivery_mode, base_location } = body

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, company_id")
      .eq("email", userEmail)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { data: settings, error } = await supabase
      .from("delivery_settings")
      .upsert({
        company_id: userData.company_id,
        user_id: userData.id,
        delivery_mode,
        base_location,
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] API DeliverySettings: Erro ao salvar:", error)
      return NextResponse.json({ error: "Failed to save delivery settings" }, { status: 500 })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error("[v0] API DeliverySettings: Erro:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
