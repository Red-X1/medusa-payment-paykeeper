import { AbstractPaymentProvider, PaymentActions, PaymentSessionStatus } from "@medusajs/framework/utils"
import crypto from "crypto"
import {
  PaykeeperOptions,
  PaykeeperTokenResponse,
  PaykeeperInvoiceResponse,
  PaykeeperStatusResponse,
  PaykeeperCaptureResponse,
  PaykeeperRefundResponse,
  PaykeeperWebhookBody,
} from "../types"

type InjectedDependencies = {
  logger?: { info: (msg: string) => void; error: (msg: string) => void }
}

class PaykeeperProviderService extends AbstractPaymentProvider<PaykeeperOptions> {
  static identifier = "paykeeper"

  protected logger_: InjectedDependencies["logger"]
  protected options_: PaykeeperOptions

  constructor(container: InjectedDependencies, options: PaykeeperOptions) {
    super(container, options)
    this.logger_ = container.logger
    this.options_ = options
  }

  private get baseUrl(): string {
    return this.options_.server.replace(/\/$/, "")
  }

  private get authHeader(): string {
    const credentials = `${this.options_.login}:${this.options_.password}`
    return `Basic ${Buffer.from(credentials).toString("base64")}`
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    body?: URLSearchParams
  ): Promise<T> {
    const url = `${this.baseUrl}${path}${method === "GET" && body ? "?" + body.toString() : ""}`
    const headers: Record<string, string> = {
      Authorization: this.authHeader,
    }
    if (method === "POST") {
      headers["Content-Type"] = "application/x-www-form-urlencoded"
    }
    const res = await fetch(url, { method, headers, body: method === "POST" ? body : undefined })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Paykeeper API error ${res.status}: ${text}`)
    }
    return res.json()
  }

  private async getToken(): Promise<string> {
    const res = await this.request<PaykeeperTokenResponse>("GET", "/info/settings/token/")
    return res.token
  }

  async getConnectionStatus(): Promise<{ connected: boolean; server: string }> {
    try {
      const token = await this.getToken()
      return { connected: !!token, server: this.options_.server }
    } catch {
      return { connected: false, server: this.options_.server }
    }
  }

  private async createInvoice(
    amount: number,
    orderId: string,
    clientId: string,
    clientEmail: string,
    cartId: string
  ): Promise<PaykeeperInvoiceResponse> {
    const token = await this.getToken()
    const body = new URLSearchParams({
      token,
      pay_amount: amount.toFixed(2),
      orderid: orderId,
      clientid: clientId,
      client_email: clientEmail,
      service_name: JSON.stringify({
        service_name: "Order payment",
        user_result_callback: `${this.options_.storefront_url.replace(/\/$/, "")}/payments/callback?cart_id=${cartId}`,
      }),
    })
    return this.request<PaykeeperInvoiceResponse>("POST", "/change/invoice/preview/", body)
  }

  async initiatePayment(
    input: any
  ): Promise<{ id: string; status: PaymentSessionStatus; data?: any }> {
    const { amount, data, context } = input
    const email = context?.customer?.email || data?.customer?.email || ""
    const cartId = data?.cart_id || context?.cart_id || ""
    const orderId = data?.session_id || `order_${Date.now()}`
    const invoice = await this.createInvoice(amount, orderId, email, email, cartId)
    return {
      id: invoice.invoice_id,
      status: PaymentSessionStatus.PENDING,
      data: { invoice_url: invoice.invoice_url, invoice_id: invoice.invoice_id },
    }
  }

  async authorizePayment(
    input: any
  ): Promise<{ status: PaymentSessionStatus; data?: any }> {
    const invoiceId = input?.data?.invoice_id || input?.data?.id
    if (!invoiceId) {
      return { status: PaymentSessionStatus.PENDING, data: input?.data }
    }
    try {
      const info = await this.request<PaykeeperStatusResponse[] | PaykeeperStatusResponse>(
        "GET",
        "/info/invoice/byid/",
        new URLSearchParams({ id: invoiceId })
      )
      const result = Array.isArray(info) ? info[0] : info
      return { status: this.mapStatus(result.status), data: { ...input?.data, paykeeper_id: result.id } }
    } catch {
      return { status: PaymentSessionStatus.PENDING, data: input?.data }
    }
  }

  async capturePayment(
    input: any
  ): Promise<{ status: PaymentSessionStatus; data?: any }> {
    const invoiceId = input?.data?.invoice_id || input?.data?.id
    if (!invoiceId) return { status: PaymentSessionStatus.CAPTURED, data: input?.data }
    try {
      const token = await this.getToken()
      await this.request<PaykeeperCaptureResponse>("POST", "/change/payment/capture/", new URLSearchParams({ id: invoiceId, token }))
      return { status: PaymentSessionStatus.CAPTURED, data: input?.data }
    } catch (e: any) {
      this.logger_?.error?.("Paykeeper capture error: " + e.message)
      return { status: PaymentSessionStatus.CAPTURED, data: input?.data }
    }
  }

  async refundPayment(
    input: any
  ): Promise<{ status: PaymentSessionStatus; data?: any }> {
    const invoiceId = input?.data?.invoice_id || input?.data?.id
    const amount = input?.amount || 0
    if (!invoiceId) return { status: PaymentSessionStatus.CAPTURED, data: input?.data }
    try {
      const token = await this.getToken()
      await this.request<PaykeeperRefundResponse>(
        "POST",
        "/change/payment/reverse/",
        new URLSearchParams({ id: invoiceId, amount: amount.toFixed(2), token })
      )
      return { status: PaymentSessionStatus.CAPTURED, data: input?.data }
    } catch (e: any) {
      this.logger_?.error?.("Paykeeper refund error: " + e.message)
      return { status: PaymentSessionStatus.CAPTURED, data: input?.data }
    }
  }

  async getPaymentStatus(
    input: any
  ): Promise<{ status: PaymentSessionStatus; data?: any }> {
    return this.authorizePayment(input)
  }

  async cancelPayment(
    input: any
  ): Promise<{ status: PaymentSessionStatus; data?: any }> {
    return { status: PaymentSessionStatus.CANCELED, data: input?.data }
  }

  async deletePayment(
    input: any
  ): Promise<{ status: PaymentSessionStatus; data?: any }> {
    return { status: PaymentSessionStatus.CANCELED, data: input?.data }
  }

  async retrievePayment(
    input: any
  ): Promise<{ status: PaymentSessionStatus; data?: any }> {
    return this.getPaymentStatus(input)
  }

  async updatePayment(
    input: any
  ): Promise<{ status: PaymentSessionStatus; data?: any }> {
    return { status: PaymentSessionStatus.PENDING, data: input?.data }
  }

  async getWebhookActionAndData(
    webhookData: any
  ): Promise<{ action: PaymentActions; data?: any }> {
    try {
      const body: PaykeeperWebhookBody = webhookData?.payload?.data || webhookData
      const { id, sum, clientid, orderid, key } = body
      if (!id || !key) return { action: PaymentActions.NOT_SUPPORTED }

      const expectedKey = crypto
        .createHash("md5")
        .update(`${id}${parseFloat(sum || "0").toFixed(2)}${clientid || ""}${orderid || ""}${this.options_.secret_word}`)
        .digest("hex")

      if (key !== expectedKey) {
        this.logger_?.error?.("Paykeeper webhook: invalid signature")
        return { action: PaymentActions.NOT_SUPPORTED }
      }

      return {
        action: PaymentActions.AUTHORIZED,
        data: { session_id: orderid, amount: parseFloat(sum || "0") },
      }
    } catch (e: any) {
      this.logger_?.error?.("Paykeeper webhook error: " + e.message)
      return { action: PaymentActions.NOT_SUPPORTED }
    }
  }

  private mapStatus(status: string): PaymentSessionStatus {
    switch (status) {
      case "paid":
      case "success":
        return PaymentSessionStatus.AUTHORIZED
      case "expired":
        return PaymentSessionStatus.CANCELED
      case "refund":
        return PaymentSessionStatus.CAPTURED
      default:
        return PaymentSessionStatus.PENDING
    }
  }
}

export default PaykeeperProviderService
