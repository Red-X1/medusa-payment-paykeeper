import { EllipseMiniSolid, ArrowRightMini } from "@medusajs/icons"
import { Badge, Button, Container, Text } from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Medusa from "@medusajs/js-sdk"

const sdk = new Medusa({ baseUrl: "/", auth: { type: "session" } })

export const ConnectionStatusCard = () => {
  const queryClient = useQueryClient()

  const { data: status, isPending } = useQuery({
    queryKey: ["paykeeper", "status"],
    queryFn: () => sdk.client.fetch("/admin/paykeeper/status"),
    refetchOnWindowFocus: true,
  })

  const { mutate: refresh, isPending: isRefreshing } = useMutation({
    mutationFn: () => sdk.client.fetch("/admin/paykeeper/status"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paykeeper"] })
    },
  })

  return (
    <Container className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <EllipseMiniSolid
          className={
            isPending
              ? "text-ui-fg-muted"
              : status?.connected
                ? "text-ui-fg-interactive"
                : "text-ui-fg-error"
          }
        />
        <div>
          <Text size="small" leading="compact" weight="plus">
            {isPending
              ? "Checking..."
              : status?.connected
                ? "Connected"
                : "Disconnected"}
          </Text>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            Server: {status?.server || "Not configured"}
          </Text>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {status?.timestamp && (
          <Text size="small" className="text-ui-fg-muted">
            Last checked: {new Date(status.timestamp).toLocaleTimeString()}
          </Text>
        )}
        <Button
          size="small"
          variant="secondary"
          isLoading={isRefreshing}
          onClick={() => refresh()}
        >
          <ArrowRightMini className="text-ui-fg-subtle" />
          Test Connection
        </Button>
      </div>
    </Container>
  )
}
