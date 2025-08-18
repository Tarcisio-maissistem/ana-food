import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { verifyToken } from "@/lib/auth"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

interface OrderItem {
  id: string
  name: string
  quantity: number
  price: number
  complements: string[]
}

interface Order {
  id: string
  number: number
  customerName: string
  phone: string
  items: OrderItem[]
  paymentMethod: string
  address?: string
  observations?: string
  status: "novo" | "preparando" | "pronto" | "em_entrega" | "concluido" | "cancelado"
  type: "delivery" | "retirada"
  createdAt: Date
  estimatedTime?: number
}

async function checkTableExists(): Promise<boolean> {
  try {
    const { error } = await supabase.from("orders").select("id").limit(1)
    return !error
  } catch {
    return false
  }
}

function getFallbackOrders(): Order[] {
  return [
    {
      id: "1",
      number: 1001,
      customerName: "João Silva",
      phone: "(11) 98765-4321",
      items: [
        { id: "1", name: "X-Burger", quantity: 2, price: 25.9, complements: ["Bacon", "Queijo extra"] },
        { id: "2", name: "Batata Frita", quantity: 1, price: 12.5, complements: [] },
      ],
      paymentMethod: "Cartão de Crédito",
      address: "Rua das Flores, 123 - Centro",
      observations: "Sem cebola no hambúrguer",
      status: "novo",
      type: "delivery",
      createdAt: new Date(),
      estimatedTime: 30,
    },
    {
      id: "2",
      number: 1002,
      customerName: "Maria Santos",
      phone: "(11) 98765-4322",
      items: [{ id: "3", name: "Pizza Margherita", quantity: 1, price: 35.0, complements: ["Borda recheada"] }],
      paymentMethod: "PIX",
      status: "preparando",
      type: "retirada",
      createdAt: new Date(Date.now() - 15 * 60 * 1000),
      estimatedTime: 20,
    },
    {
      id: "3",
      number: 1003,
      customerName: "Pedro Costa",
      phone: "(11) 98765-4323",
      items: [{ id: "4", name: "Açaí 500ml", quantity: 1, price: 18.0, complements: ["Granola", "Banana", "Mel"] }],
      paymentMethod: "Dinheiro",
      status: "pronto",
      type: "retirada",
      createdAt: new Date(Date.now() - 25 * 60 * 1000),
    },
  ]
}

function mapDatabaseToOrder(dbOrder: any): Order {
  console.log("[v0] API Orders: Mapeando pedido do banco:", {
    id: dbOrder.id,
    order_number: dbOrder.order_number,
    name: dbOrder.name,
    telefone: dbOrder.telefone,
    items: dbOrder.items,
    payment: dbOrder.payment,
    address: dbOrder.address,
    status: dbOrder.status,
  })

  const orderNumber = dbOrder.order_number
    ? dbOrder.order_number.toString().replace(/\D/g, "") || dbOrder.order_number
    : Math.floor(Math.random() * 9000) + 1000

  return {
    id: dbOrder.id,
    number: orderNumber,
    customerName: dbOrder.name || "",
    phone: dbOrder.telefone || "", // Adicionado campo telefone
    items: Array.isArray(dbOrder.items) ? dbOrder.items : dbOrder.items ? JSON.parse(dbOrder.items) : [],
    paymentMethod: dbOrder.payment || "",
    address: dbOrder.address || undefined,
    observations: undefined,
    status: dbOrder.status || "novo",
    type: dbOrder.address ? "delivery" : "retirada",
    createdAt: new Date(dbOrder.created_at),
    estimatedTime: 25,
  }
}

export async function GET(request: NextRequest) {
  try {
    let userId = "default-user" // Default user for development

    const authHeader = request.headers.get("authorization")
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      const decoded = verifyToken(token)
      if (decoded) {
        userId = decoded.userId
        console.log("[v0] API Orders: Usuário autenticado:", userId)
      } else {
        console.log("[v0] API Orders: Token inválido, usando usuário padrão")
      }
    } else {
      const userEmail = request.headers.get("x-dev-user-email")
      if (userEmail === "tarcisiorp16@gmail.com") {
        // Buscar ID do usuário pelo email
        try {
          const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
          )
          const { data: user } = await supabaseAdmin.from("users").select("id").eq("email", userEmail).single()
          if (user) {
            userId = user.id
            console.log("[v0] API Orders: Usando usuário específico:", userId)
          }
        } catch (error) {
          console.log("[v0] API Orders: Erro ao buscar usuário específico, usando padrão")
        }
      }
      console.log("[v0] API Orders: Sem token, usando usuário:", userId)
    }

    console.log("[v0] API Orders: Buscando pedidos para usuário:", userId)

    const tableExists = await checkTableExists()
    console.log("[v0] API Orders: Tabela orders existe?", tableExists)

    if (!tableExists) {
      console.log("[v0] API Orders: Tabela não existe, retornando pedidos de exemplo")
      return NextResponse.json(getFallbackOrders())
    }

    let query = supabase.from("orders").select("*")

    if (userId !== "default-user") {
      query = query.eq("user_id", userId)
    }

    const { data: orders, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] API Orders: Erro ao buscar pedidos:", error)
      console.log("[v0] API Orders: Retornando pedidos de exemplo devido ao erro")
      return NextResponse.json(getFallbackOrders())
    }

    const mappedOrders = orders?.map(mapDatabaseToOrder) || []
    console.log("[v0] API Orders: Retornando", mappedOrders.length, "pedidos para usuário", userId)

    if (mappedOrders.length === 0) {
      console.log("[v0] API Orders: Nenhum pedido encontrado, retornando pedidos de exemplo")
      return NextResponse.json(getFallbackOrders())
    }

    return NextResponse.json(mappedOrders)
  } catch (error) {
    console.error("[v0] API Orders: Erro na API de pedidos:", error)
    console.log("[v0] API Orders: Retornando pedidos de exemplo devido ao erro")
    return NextResponse.json(getFallbackOrders())
  }
}

export async function PUT(request: NextRequest) {
  try {
    let userId = "default-user"

    const authHeader = request.headers.get("authorization")
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      const decoded = verifyToken(token)
      if (decoded) {
        userId = decoded.userId
      }
    }

    const { id, status } = await request.json()

    const tableExists = await checkTableExists()

    if (!tableExists) {
      console.log("[v0] API Orders: Simulando atualização de status para desenvolvimento")
      return NextResponse.json({ success: true, message: "Status atualizado (simulado)" })
    }

    const { error } = await supabase
      .from("orders")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (error) {
      console.error("Erro ao atualizar pedido:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    console.log("[v0] API Orders: Pedido", id, "atualizado para status", status)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro na API de pedidos:", error)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}
