import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import PaykeeperProviderService from "./services/paykeeper-provider"

export default ModuleProvider(Modules.PAYMENT, {
  services: [PaykeeperProviderService],
})
