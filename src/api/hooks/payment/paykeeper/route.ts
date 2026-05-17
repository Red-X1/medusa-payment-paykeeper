import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules, PaymentWebhookEvents } from "@medusajs/framework/utils"
import crypto from "crypto"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { id, sum, clientid, orderid, key } = (req.body || {}) as Record<string, string>

    if (!id || !key) {
      res.status(400).send("Missing required parameters")
      return
    }

    const secretWord = process.env.PAYKEEPER_SECRET_WORD
    if (!secretWord) {
      res.status(500).send("Paykeeper secret word not configured")
      return
    }

    const sumFormatted = parseFloat(sum || "0").toFixed(2)
    const expectedKey = crypto
      .createHash("md5")
      .update(`${id}${sumFormatted}${clientid || ""}${orderid || ""}${secretWord}`)
      .digest("hex")

    if (key !== expectedKey) {
      res.status(403).send("Error! Hash mismatch")
      return
    }

    const responseHash = crypto.createHash("md5").update(`${id}${secretWord}`).digest("hex")

    const eventBus = req.scope.resolve(Modules.EVENT_BUS)
    await eventBus.emit(
      {
        name: PaymentWebhookEvents.WebhookReceived,
        data: {
          provider: "paykeeper",
          payload: { data: req.body, rawData: req.rawBody, headers: req.headers },
        },
      },
      { delay: 5000, attempts: 3 }
    )

    res.status(200).type("text/plain").send(`OK ${responseHash}`)
  } catch (err: any) {
    res.status(400).send(`Webhook Error: ${err.message}`)
  }
}
