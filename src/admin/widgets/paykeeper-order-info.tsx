import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps } from "@medusajs/framework/types"
import { Container, Text, Badge } from "@medusajs/ui"
import { EllipseMiniSolid } from "@medusajs/icons"
import { useQuery } from "@tanstack/react-query"
import Medusa from "@medusajs/js-sdk"

const sdk = new Medusa({ baseUrl: "/", auth: { type: "session" } })

const PaykeeperOrderWidget = ({ data: order }: DetailWidgetProps<any>) => {
  const paymentCollectionId = order?.payment_collection?.id || order?.payment_collection_id

  const { data: paymentData, isPending } = useQuery({
    queryKey: ["paykeeper-order-payment", paymentCollectionId],
    queryFn: async () => {
      if (!paymentCollectionId) return null
      return sdk.client.fetch(
        `/admin/payment-collections/${paymentCollectionId}?fields=payment_sessions.*`
      )
    },
    enabled: !!paymentCollectionId,
  })

  const paykeeperSession = paymentData?.payment_collection?.payment_sessions?.find(
    (s: any) => s.provider_id === "pp_paykeeper"
  )

  if (!paykeeperSession) return null

  const invoiceUrl = paykeeperSession.data?.invoice_url
  const invoiceId = paykeeperSession.data?.invoice_id || paykeeperSession.id

  const statusVariant: Record<string, "orange" | "green" | "green" | "blue" | "red" | "red"> = {
    pending: "orange",
    authorized: "green",
    captured: "green",
    refunded: "blue",
    canceled: "red",
    failed: "red",
  }

  return (
    <Container className="flex flex-col p-0 overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-200">
        <EllipseMiniSolid className="text-ui-fg-interactive" />
        <Text size="small" leading="compact" weight="plus">
          Paykeeper Payment
        </Text>
      </div>
      <div className="px-6 py-4">
        {isPending ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 w-48 bg-ui-bg-base-hover rounded" />
            <div className="h-4 w-32 bg-ui-bg-base-hover rounded" />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Text size="small" className="text-ui-fg-subtle">Status</Text>
              <Badge
                color={statusVariant[paykeeperSession.status] || "grey"}
                size="small"
              >
                {paykeeperSession.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <Text size="small" className="text-ui-fg-subtle">Invoice ID</Text>
              <Text size="small" leading="compact" className="font-mono">
                {invoiceId}
              </Text>
            </div>
            {paykeeperSession.amount != null && (
              <div className="flex items-center justify-between">
                <Text size="small" className="text-ui-fg-subtle">Amount</Text>
                <Text size="small" leading="compact">
                  {(paykeeperSession.amount / 100).toFixed(2)}{" "}
                  {paykeeperSession.currency_code?.toUpperCase()}
                </Text>
              </div>
            )}
            {invoiceUrl && (
              <div className="flex items-center justify-between">
                <Text size="small" className="text-ui-fg-subtle">Paykeeper Link</Text>
                <a
                  href={invoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ui-fg-interactive hover:underline text-small"
                >
                  Open Invoice
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.after",
})

export default PaykeeperOrderWidget
