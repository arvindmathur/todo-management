import { Metadata } from "next"
import { AuditStatsDashboard } from "@/components/audit"

export const metadata: Metadata = {
  title: "Audit Statistics - Todo Management",
  description: "System activity overview and analytics",
}

export default function AuditStatsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <AuditStatsDashboard />
    </div>
  )
}