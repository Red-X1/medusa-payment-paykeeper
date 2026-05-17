import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CreditCard } from "@medusajs/icons"
import { Container, Heading, Toaster } from "@medusajs/ui"
import { ConnectionStatusCard } from "./components/connection-status-card"
import { StatisticsCards } from "./components/statistics-cards"
import { TransactionsTable } from "./components/transactions-table"

const Paykeeper = () => {
  return (
    <>
      <Container className="flex flex-col p-0 overflow-hidden mb-4">
        <Heading className="p-6 pb-0 font-sans font-medium h1-core">
          Paykeeper
        </Heading>
        <div className="p-6">
          <ConnectionStatusCard />
        </div>
      </Container>
      <StatisticsCards />
      <Container className="flex flex-col p-0 overflow-hidden mt-4">
        <Heading className="p-6 pb-0 font-sans font-medium h1-core">
          Transactions
        </Heading>
        <TransactionsTable />
      </Container>
      <Toaster />
    </>
  )
}

export const config = defineRouteConfig({
  label: "Paykeeper",
  icon: CreditCard,
})

export default Paykeeper
