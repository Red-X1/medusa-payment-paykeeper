export type PaykeeperOptions = {
  server: string
  login: string
  password: string
  secret_word: string
  storefront_url: string
}

export type PaykeeperInvoiceResponse = {
  invoice_id: string
  invoice_url: string
  invoice?: string
}

export type PaykeeperTokenResponse = {
  token: string
}

export type PaykeeperStatusResponse = {
  id: string
  status: string
  pay_amount: string
  clientid: string
  orderid: string | null
}

export type PaykeeperCaptureResponse = {
  result: string
  msg?: string
  total?: string
  captured?: string
}

export type PaykeeperRefundResponse = {
  result: string
  msg?: string
}

export type PaykeeperWebhookBody = {
  id: string
  sum: string
  clientid: string
  orderid: string
  key: string
  [key: string]: any
}
