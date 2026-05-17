import { Container, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import Medusa from "@medusajs/js-sdk"

const sdk = new Medusa({ baseUrl: "/", auth: { type: "session" } })

const StatCard = ({ label, value }: { label: string; value: string | number }) => (
  <Container className="flex flex-col gap-1 p-4 flex-1">
    <Text size="small" leading="compact" className="text-ui-fg-subtle">
      {label}
    </Text>
    <Text size="xlarge" leading="compact" weight="plus">
      {value}
    </Text>
  </Container>
)

export const StatisticsCards = () => {
  const { data, isPending } = useQuery({
    queryKey: ["paykeeper", "transactions", { limit: 1 }],
    queryFn: () => sdk.client.fetch("/admin/paykeeper?limit=1"),
  })

  if (isPending) {
    return (
      <div className="flex gap-3">
        {[...Array(4)].map((_, i) => (
          <Container key={i} className="flex flex-col gap-1 p-4 flex-1 animate-pulse">
            <div className="h-3 w-20 bg-ui-bg-base-hover rounded" />
            <div className="h-6 w-16 bg-ui-bg-base-hover rounded mt-1" />
          </Container>
        ))}
      </div>
    )
  }

  const stats = data?.stats

  return (
    <div className="flex gap-3">
      <StatCard label="Total Payments" value={stats?.total_count ?? 0} />
      <StatCard label="Total Amount" value={`${((stats?.total_amount ?? 0) / 100).toFixed(2)} ₽`} />
      <StatCard label="Pending" value={stats?.pending_count ?? 0} />
      <StatCard label="Refunded" value={stats?.refunded_count ?? 0} />
    </div>
  )
}
