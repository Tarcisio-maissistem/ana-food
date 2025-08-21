import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createPaginationResult } from "@/lib/pagination-utils"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userEmail = request.headers.get("x-user-email")

    if (!userEmail) {
      return NextResponse.json({ error: "User email required" }, { status: 401 })
    }

    const { data: user } = await supabase.from("users").select("id, company_id").eq("email", userEmail).single()

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search") || ""
    const actionType = searchParams.get("action_type") || ""
    const tableName = searchParams.get("table_name") || ""
    const dateFrom = searchParams.get("date_from") || ""
    const dateTo = searchParams.get("date_to") || ""
    const isExport = searchParams.get("export") === "true"

    let query = supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .eq("company_id", user.company_id)
      .order("created_at", { ascending: false })

    // Apply filters
    if (search) {
      query = query.or(`table_name.ilike.%${search}%,record_id.ilike.%${search}%`)
    }

    if (actionType) {
      query = query.eq("action_type", actionType)
    }

    if (tableName) {
      query = query.eq("table_name", tableName)
    }

    if (dateFrom) {
      query = query.gte("created_at", dateFrom)
    }

    if (dateTo) {
      query = query.lte("created_at", dateTo + "T23:59:59")
    }

    if (isExport) {
      const { data: logs } = await query.limit(10000)

      if (!logs) {
        return NextResponse.json({ error: "No logs found" }, { status: 404 })
      }

      const csv = [
        "Data/Hora,Ação,Tabela,Registro,IP,User Agent",
        ...logs.map((log) =>
          [
            new Date(log.created_at).toLocaleString("pt-BR"),
            log.action_type,
            log.table_name,
            log.record_id || "",
            log.ip_address || "",
            log.user_agent || "",
          ].join(","),
        ),
      ].join("\n")

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=audit-logs.csv",
        },
      })
    }

    const offset = (page - 1) * limit
    const { data: logs, count } = await query.range(offset, offset + limit - 1)

    if (!logs) {
      return NextResponse.json(createPaginationResult([], 0, { page, limit }))
    }

    return NextResponse.json(createPaginationResult(logs, count || 0, { page, limit }))
  } catch (error) {
    console.error("Audit logs API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
