import { FetchError } from "@medusajs/js-sdk"
import { useMutation, useQuery, useQueryClient, UseQueryOptions } from "@tanstack/react-query"
import { sdk } from "../../lib/client"

export const paykeeperQueryKey = {
  all: ["paykeeper"] as const,
  lists: () => [...paykeeperQueryKey.all, "list"] as const,
  list: (query?: Record<string, any>) => [...paykeeperQueryKey.lists(), query] as const,
  details: () => [...paykeeperQueryKey.all, "detail"] as const,
  detail: (id: string) => [...paykeeperQueryKey.details(), id] as const,
}

export const usePaykeeperStatus = (
  options?: UseQueryOptions<any, FetchError>
) => {
  return useQuery({
    queryKey: paykeeperQueryKey.detail("status"),
    queryFn: () => sdk.client.fetch("/admin/paykeeper/status"),
    refetchOnWindowFocus: true,
    ...options,
  })
}

export const usePaykeeperTransactions = (
  query?: Record<string, any>,
  options?: UseQueryOptions<any, FetchError>
) => {
  return useQuery({
    queryKey: paykeeperQueryKey.list(query),
    queryFn: () => sdk.client.fetch("/admin/paykeeper", { method: "GET", query }),
    ...options,
  })
}

export const useRefreshPaykeeper = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => sdk.client.fetch("/admin/paykeeper/status"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paykeeperQueryKey.all })
    },
  })
}
