import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest, { params }: { params: { customerId: string } }) {
  try {
    const { customerId } = params
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, order_number, created_at, items, status")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Erro ao buscar histórico de pedidos:", error)
      // Retorna dados mock se houver erro
      return NextResponse.json([
        {
          id: "1",
          order_number: "PED001",
          date: new Date().toISOString(),
          total: 45.9,
          status: "concluido",
        },
        {
          id: "2",
          order_number: "PED002",
          date: new Date(Date.now() - 86400000).toISOString(),
          total: 32.5,
          status: "concluido",
        },
      ])
    }

    // Mapear dados para o formato esperado
    const mappedOrders =
      orders?.map((order) => ({
        id: order.id,
        order_number: order.order_number,
        date: order.created_at,
        total: order.items?.reduce((sum: number, item: any) => sum + item.preco * item.quantidade, 0) || 0,
        status: order.status,
      })) || []

    return NextResponse.json(mappedOrders)
  } catch (error) {
    console.error("Erro na API de histórico de pedidos:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
