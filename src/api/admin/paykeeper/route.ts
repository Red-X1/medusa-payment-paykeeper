import type { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const paymentService = req.scope.resolve(Modules.PAYMENT)
  const { offset = 0, limit = 20 } = req.query as Record<string, any>

  const allSessions = await paymentService.listPaymentSessions(
    { provider_id: "pp_paykeeper" },
    {
      select: ["id", "amount", "status", "currency_code", "created_at", "data"],
      order: { created_at: "DESC" },
    }
  )

  const totalCount = allSessions.length
  const pagedSessions = allSessions.slice(Number(offset), Number(offset) + Number(limit))

  const totalAmount = allSessions
    .filter((s: any) => s.amount != null && (s.status === "authorized" || s.status === "captured"))
    .reduce((sum: number, s: any) => sum + Number(s.amount), 0)

  res.json({
    transactions: pagedSessions,
    count: totalCount,
    offset: Number(offset),
    limit: Number(limit),
    stats: {
      total_count: totalCount,
      total_amount: totalAmount,
      pending_count: allSessions.filter((s: any) => s.status === "pending").length,
      refunded_count: 0,
      captured_count: allSessions.filter((s: any) => s.status === "captured").length,
    },
  })
}
