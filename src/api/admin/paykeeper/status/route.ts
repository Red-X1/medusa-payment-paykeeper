import type { MedusaRequest, MedusaResponse } from "@medusajs/framework"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const server = (process.env.PAYKEEPER_SERVER || "https://kassa-5473018740.server.paykeeper.ru").replace(/\/$/, "")
  const login = process.env.PAYKEEPER_LOGIN || "miradea-shop"
  const password = process.env.PAYKEEPER_PASSWORD || "miradeashop"

  try {
    const credentials = Buffer.from(`${login}:${password}`).toString("base64")
    const response = await fetch(`${server}/info/settings/token/`, {
      headers: { Authorization: `Basic ${credentials}` },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      res.json({ connected: false, server, timestamp: new Date().toISOString() })
      return
    }

    const data = await response.json()
    res.json({ connected: !!data.token, server, timestamp: new Date().toISOString() })
  } catch {
    res.json({ connected: false, server, timestamp: new Date().toISOString() })
  }
}
