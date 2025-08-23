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

    const { data: paymentMethods, error } = await supabase
      .from("payment_methods")
      .select("*")
      .eq("company_id", userData.company_id)
      .order("name")

    if (error) {
      console.error("[v0] API PaymentMethods: Erro ao buscar:", error)
      return NextResponse.json({ error: "Failed to fetch payment methods" }, { status: 500 })
    }

    return NextResponse.json(paymentMethods || [])
  } catch (error) {
    console.error("[v0] API PaymentMethods: Erro:", error)
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
    const { name, active = true } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, company_id")
      .eq("email", userEmail)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { data: paymentMethod, error } = await supabase
      .from("payment_methods")
      .insert({
        name: name.trim(),
        active,
        company_id: userData.company_id,
        user_id: userData.id,
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] API PaymentMethods: Erro ao criar:", error)
      return NextResponse.json({ error: "Failed to create payment method" }, { status: 500 })
    }

    return NextResponse.json(paymentMethod)
  } catch (error) {
    console.error("[v0] API PaymentMethods: Erro:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userEmail = request.headers.get("x-user-email")
    if (!userEmail) {
      return NextResponse.json({ error: "User email required" }, { status: 400 })
    }

    const body = await request.json()
    const { id, name, active } = body

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, company_id")
      .eq("email", userEmail)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { data: paymentMethod, error } = await supabase
      .from("payment_methods")
      .update({
        ...(name && { name: name.trim() }),
        ...(typeof active === "boolean" && { active }),
      })
      .eq("id", id)
      .eq("company_id", userData.company_id)
      .select()
      .single()

    if (error) {
      console.error("[v0] API PaymentMethods: Erro ao atualizar:", error)
      return NextResponse.json({ error: "Failed to update payment method" }, { status: 500 })
    }

    return NextResponse.json(paymentMethod)
  } catch (error) {
    console.error("[v0] API PaymentMethods: Erro:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userEmail = request.headers.get("x-user-email")
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!userEmail) {
      return NextResponse.json({ error: "User email required" }, { status: 400 })
    }

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, company_id")
      .eq("email", userEmail)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { error } = await supabase.from("payment_methods").delete().eq("id", id).eq("company_id", userData.company_id)

    if (error) {
      console.error("[v0] API PaymentMethods: Erro ao excluir:", error)
      return NextResponse.json({ error: "Failed to delete payment method" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] API PaymentMethods: Erro:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
