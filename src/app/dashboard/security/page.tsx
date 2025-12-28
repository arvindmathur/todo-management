import { Metadata } from "next"
import { SecurityDashboard } from "@/components/audit"

export const metadata: Metadata = {
  title: "Security Dashboard - Todo Management",
  description: "Monitor security events and threats",
}

export default function SecurityPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <SecurityDashboard />
    </div>
  )
}