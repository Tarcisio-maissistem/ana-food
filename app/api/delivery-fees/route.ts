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

    const { data: deliveryFees, error } = await supabase
      .from("delivery_fees")
      .select("*")
      .eq("company_id", userData.company_id)
      .order("neighborhood")

    if (error) {
      console.error("[v0] API DeliveryFees: Erro ao buscar:", error)
      return NextResponse.json({ error: "Failed to fetch delivery fees" }, { status: 500 })
    }

    return NextResponse.json(deliveryFees || [])
  } catch (error) {
    console.error("[v0] API DeliveryFees: Erro:", error)
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
    const { neighborhood, fee, active = true } = body

    if (!neighborhood?.trim() || fee === undefined) {
      return NextResponse.json({ error: "Neighborhood and fee are required" }, { status: 400 })
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, company_id")
      .eq("email", userEmail)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { data: deliveryFee, error } = await supabase
      .from("delivery_fees")
      .insert({
        neighborhood: neighborhood.trim(),
        fee: Number.parseFloat(fee),
        active,
        company_id: userData.company_id,
        user_id: userData.id,
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] API DeliveryFees: Erro ao criar:", error)
      return NextResponse.json({ error: "Failed to create delivery fee" }, { status: 500 })
    }

    return NextResponse.json(deliveryFee)
  } catch (error) {
    console.error("[v0] API DeliveryFees: Erro:", error)
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
    const { id, neighborhood, fee, active } = body

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

    const updateData: any = {}
    if (neighborhood) updateData.neighborhood = neighborhood.trim()
    if (fee !== undefined) updateData.fee = Number.parseFloat(fee)
    if (typeof active === "boolean") updateData.active = active

    const { data: deliveryFee, error } = await supabase
      .from("delivery_fees")
      .update(updateData)
      .eq("id", id)
      .eq("company_id", userData.company_id)
      .select()
      .single()

    if (error) {
      console.error("[v0] API DeliveryFees: Erro ao atualizar:", error)
      return NextResponse.json({ error: "Failed to update delivery fee" }, { status: 500 })
    }

    return NextResponse.json(deliveryFee)
  } catch (error) {
    console.error("[v0] API DeliveryFees: Erro:", error)
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

    const { error } = await supabase.from("delivery_fees").delete().eq("id", id).eq("company_id", userData.company_id)

    if (error) {
      console.error("[v0] API DeliveryFees: Erro ao excluir:", error)
      return NextResponse.json({ error: "Failed to delete delivery fee" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] API DeliveryFees: Erro:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
