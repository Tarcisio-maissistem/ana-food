import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

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

async function getUserByEmail(email: string): Promise<string | null> {
  try {
    console.log("[v0] API Orders: Buscando usuário por email:", email)

    const connectionTest = await Promise.race([
      supabase.from("users").select("id").limit(1),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 5000)),
    ])

    if (connectionTest && "error" in connectionTest && connectionTest.error) {
      console.warn("[v0] API Orders: Conexão com banco indisponível")
      return null // Return null instead of fallback user ID
    }

    const { data: user, error } = await Promise.race([
      supabase.from("users").select("id").eq("email", email).maybeSingle(),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Query timeout")), 8000)),
    ])

    if (error) {
      console.error("[v0] API Orders: Erro ao buscar usuário:", error)
      return null // Return null instead of fallback user ID
    }

    console.log("[v0] API Orders: Usuário encontrado:", user?.id)
    return user?.id || null
  } catch (error) {
    console.error("[v0] API Orders: Exceção ao buscar usuário:", error)
    return null // Return null instead of fallback user ID
  }
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

function safeVerifyToken(token: string): any {
  try {
    // Importação dinâmica para evitar erros de módulo
    const { verifyToken } = require("@/lib/auth")
    return verifyToken(token)
  } catch (error) {
    console.error("[v0] API Orders: Erro ao verificar token:", error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] API Orders: Iniciando busca de pedidos")

    let userId = await getUserByEmail("tarcisiorp16@gmail.com")

    if (!userId) {
      console.log("[v0] API Orders: Usuário não encontrado no banco de dados")
      return NextResponse.json([], { status: 200 }) // Return empty array instead of mock data
    }

    const authHeader = request.headers.get("authorization")
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      console.log("[v0] API Orders: Token recebido, verificando...")

      const decoded = safeVerifyToken(token)
      if (decoded) {
        userId = decoded.userId
        console.log("[v0] API Orders: Usuário autenticado:", userId)
      }
    }

    console.log("[v0] API Orders: Buscando pedidos para usuário:", userId)

    const tableExists = await checkTableExists()
    console.log("[v0] API Orders: Tabela orders existe?", tableExists)

    if (!tableExists) {
      console.log("[v0] API Orders: Tabela orders não existe")
      return NextResponse.json([], { status: 200 }) // Return empty array instead of mock data
    }

    let query = supabase.from("orders").select("*").order("created_at", { ascending: false })

    query = query.eq("user_id", userId)

    const { data: orders, error } = await query

    if (error) {
      console.error("[v0] API Orders: Erro ao buscar pedidos:", error)
      return NextResponse.json([], { status: 200 }) // Return empty array instead of mock data
    }

    const mappedOrders = orders?.map(mapDatabaseToOrder) || []
    console.log("[v0] API Orders: Retornando", mappedOrders.length, "pedidos do banco de dados")

    return NextResponse.json(mappedOrders) // Always return real data from database, even if empty
  } catch (error) {
    console.error("[v0] API Orders: Erro na API de pedidos:", error)
    return NextResponse.json([], { status: 200 }) // Return empty array instead of mock data
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log("[v0] API Orders: Iniciando atualização de pedido")

    let userId = await getUserByEmail("tarcisiorp16@gmail.com")

    if (!userId) {
      console.log("[v0] API Orders: Usuário não encontrado")
      return NextResponse.json({ success: false, error: "Usuário não encontrado" }, { status: 401 })
    }

    const authHeader = request.headers.get("authorization")
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      const decoded = safeVerifyToken(token)
      if (decoded) {
        userId = decoded.userId
      }
    }

    const { id, status } = await request.json()
    console.log("[v0] API Orders: Atualizando pedido", id, "para status", status)

    const tableExists = await checkTableExists()

    if (!tableExists) {
      console.log("[v0] API Orders: Tabela orders não existe")
      return NextResponse.json({ success: false, error: "Tabela não encontrada" }, { status: 404 })
    }

    const { error } = await supabase
      .from("orders")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (error) {
      console.error("[v0] API Orders: Erro ao atualizar pedido:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    console.log("[v0] API Orders: Pedido", id, "atualizado para status", status)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] API Orders: Erro na API de atualização:", error)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}
