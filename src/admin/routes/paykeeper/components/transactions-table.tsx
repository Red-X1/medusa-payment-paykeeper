import { Badge, Container, Table, Text, Pagination } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useSearchParams, Link } from "react-router-dom"
import Medusa from "@medusajs/js-sdk"

const sdk = new Medusa({ baseUrl: "/", auth: { type: "session" } })

const statusVariant: Record<string, "green" | "orange" | "red" | "blue" | "purple"> = {
  pending: "orange",
  authorized: "green",
  captured: "green",
  refunded: "blue",
  canceled: "red",
  failed: "red",
}

export const TransactionsTable = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const offset = Number(searchParams.get("offset") || 0)
  const limit = Number(searchParams.get("limit") || 20)

  const { data, isPending } = useQuery({
    queryKey: ["paykeeper", "transactions", { offset, limit }],
    queryFn: () => sdk.client.fetch(`/admin/paykeeper?offset=${offset}&limit=${limit}`),
  })

  if (isPending) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-ui-bg-base-hover rounded" />
          ))}
        </div>
      </div>
    )
  }

  const pageCount = Math.ceil((data?.count ?? 0) / limit)
  const currentPage = Math.floor(offset / limit) + 1

  const handlePageChange = (page: number) => {
    setSearchParams({ offset: String((page - 1) * limit), limit: String(limit) })
  }

  return (
    <div>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>ID</Table.HeaderCell>
            <Table.HeaderCell>Amount</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Currency</Table.HeaderCell>
            <Table.HeaderCell>Created</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {(data?.transactions ?? []).length === 0 ? (
            <Table.Row>
              <Table.Cell colSpan={5}>
                <div className="flex items-center justify-center py-12">
                  <Text size="small" className="text-ui-fg-subtle">
                    No Paykeeper transactions yet
                  </Text>
                </div>
              </Table.Cell>
            </Table.Row>
          ) : (
            data?.transactions.map((tx: any) => (
              <Table.Row key={tx.id}>
                <Table.Cell>
                  <Link
                    to={`/app/orders?payment_session_id=${tx.id}`}
                    className="text-ui-fg-interactive hover:underline"
                  >
                    <Text size="small" leading="compact">
                      {tx.id.slice(0, 12)}...
                    </Text>
                  </Link>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small" leading="compact">
                    {tx.amount != null ? (tx.amount / 100).toFixed(2) : "—"}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Badge color={statusVariant[tx.status] || "grey"} size="small">
                    {tx.status}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small" leading="compact">
                    {tx.currency_code?.toUpperCase() || "—"}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small" leading="compact" className="text-ui-fg-subtle">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </Text>
                </Table.Cell>
              </Table.Row>
            ))
          )}
        </Table.Body>
      </Table>
      {(data?.count ?? 0) > limit && (
        <Pagination
          count={data?.count ?? 0}
          pageSize={limit}
          pageIndex={currentPage - 1}
          pageCount={pageCount}
          nextPage={() => handlePageChange(currentPage + 1)}
          prevPage={() => handlePageChange(currentPage - 1)}
        />
      )}
    </div>
  )
}
