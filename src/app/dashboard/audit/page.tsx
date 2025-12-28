import { Metadata } from "next"
import { AuditLogViewer } from "@/components/audit"

export const metadata: Metadata = {
  title: "Audit Logs - Todo Management",
  description: "View system activity and security events",
}

export default function AuditPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <AuditLogViewer />
    </div>
  )
}