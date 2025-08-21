import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export interface AuditLogData {
  userId: string
  companyId: string
  tableName: string
  recordId?: string
  actionType: "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "ONBOARDING_START" | "ONBOARDING_COMPLETE"
  oldValues?: any
  newValues?: any
  ipAddress?: string
  userAgent?: string
  sessionId?: string
  requestUrl?: string
}

export class AuditLogger {
  static async log(data: AuditLogData) {
    try {
      console.log("[v0] Audit Log:", data.actionType, data.tableName, data.recordId)

      const { error } = await supabase.from("audit_logs").insert({
        user_id: data.userId,
        company_id: data.companyId,
        table_name: data.tableName,
        record_id: data.recordId,
        action_type: data.actionType,
        old_values: data.oldValues,
        new_values: data.newValues,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        session_id: data.sessionId,
        request_url: data.requestUrl,
        created_at: new Date().toISOString(),
      })

      if (error) {
        console.error("[v0] Audit Log Error:", error)
        // Don't throw error to avoid breaking main operations
      }
    } catch (error) {
      console.error("[v0] Audit Log Exception:", error)
      // Fail silently to not impact main functionality
    }
  }

  static async logUserAction(
    userId: string,
    companyId: string,
    action: AuditLogData["actionType"],
    tableName: string,
    recordId?: string,
    oldValues?: any,
    newValues?: any,
    request?: Request,
  ) {
    const ipAddress = request?.headers.get("x-forwarded-for") || request?.headers.get("x-real-ip") || "unknown"

    const userAgent = request?.headers.get("user-agent") || "unknown"
    const requestUrl = request?.url || "unknown"

    await this.log({
      userId,
      companyId,
      tableName,
      recordId,
      actionType: action,
      oldValues,
      newValues,
      ipAddress,
      userAgent,
      requestUrl,
    })
  }
}
