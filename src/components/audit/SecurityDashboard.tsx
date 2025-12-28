"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"

interface SecurityEvent {
  id: string
  action: string
  timestamp: string
  user?: {
    id: string
    name?: string
    email: string
  }
  metadata?: {
    ipAddress?: string
    userAgent?: string
    reasons?: string[]
    severity?: string
  }
}

interface SecurityStats {
  totalEvents: number
  recentEvents: SecurityEvent[]
  threatsByType: Array<{ type: string; count: number }>
  suspiciousIPs: Array<{ ip: string; count: number }>
}

export function SecurityDashboard() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<SecurityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<"1h" | "24h" | "7d" | "30d">("24h")

  const fetchSecurityStats = async (range: string = timeRange) => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/audit/logs?action=SECURITY&timeRange=${range}&limit=50`)
      
      if (response.ok) {
        const data = await response.json()
        
        // Process security events
        const securityEvents = data.logs.filter((log: any) => log.action.startsWith("SECURITY_"))
        
        // Group by threat type
        const threatsByType = securityEvents.reduce((acc: any, event: SecurityEvent) => {
          const type = event.action.replace("SECURITY_", "")
          acc[type] = (acc[type] || 0) + 1
          return acc
        }, {})

        // Group by IP address
        const suspiciousIPs = securityEvents.reduce((acc: any, event: SecurityEvent) => {
          const ip = event.metadata?.ipAddress || "Unknown"
          acc[ip] = (acc[ip] || 0) + 1
          return acc
        }, {})

        setStats({
          totalEvents: securityEvents.length,
          recentEvents: securityEvents.slice(0, 10),
          threatsByType: Object.entries(threatsByType).map(([type, count]) => ({ type, count: count as number })),
          suspiciousIPs: Object.entries(suspiciousIPs)
            .map(([ip, count]) => ({ ip, count: count as number }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
        })
        setError(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to load security statistics")
      }
    } catch (err) {
      setError("Failed to load security statistics")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) {
      fetchSecurityStats()
    }
  }, [session, timeRange])

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const getSeverityColor = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return "text-red-800 bg-red-100"
      case "high":
        return "text-red-600 bg-red-50"
      case "medium":
        return "text-yellow-600 bg-yellow-50"
      case "low":
        return "text-green-600 bg-green-50"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const getThreatIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "suspicious_activity":
        return (
          <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      case "failed_login":
        return (
          <svg className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )
      case "rate_limit":
        return (
          <svg className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      default:
        return (
          <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading security dashboard...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Security Dashboard</h2>
          <p className="text-sm text-gray-600 mt-1">
            Monitor security events and threats
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Security Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Security Events</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats?.totalEvents || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Threat Types</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats?.threatsByType.length || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Suspicious IPs</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats?.suspiciousIPs.length || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Threat Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Threats by Type */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Threats by Type</h3>
          {stats?.threatsByType.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No threats detected</h3>
              <p className="mt-1 text-sm text-gray-500">Your system is secure.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats?.threatsByType.map((threat) => (
                <div key={threat.type} className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getThreatIcon(threat.type)}
                    <span className="ml-2 text-sm font-medium text-gray-900 capitalize">
                      {threat.type.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                      <div
                        className="bg-red-600 h-2 rounded-full"
                        style={{
                          width: `${Math.min(100, (threat.count / Math.max(...(stats?.threatsByType.map(t => t.count) || [1]))) * 100)}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-8 text-right">{threat.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Suspicious IPs */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Suspicious IP Addresses</h3>
          {stats?.suspiciousIPs.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No suspicious IPs</h3>
              <p className="mt-1 text-sm text-gray-500">All traffic appears normal.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats?.suspiciousIPs.map((ip) => (
                <div key={ip.ip} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="ml-2 text-sm font-medium text-gray-900 font-mono">{ip.ip}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                      <div
                        className="bg-red-600 h-2 rounded-full"
                        style={{
                          width: `${Math.min(100, (ip.count / Math.max(...(stats?.suspiciousIPs.map(i => i.count) || [1]))) * 100)}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-8 text-right">{ip.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Security Events */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Security Events</h3>
        </div>
        {stats?.recentEvents.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No recent security events</h3>
            <p className="mt-1 text-sm text-gray-500">Your system is secure.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source IP
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats?.recentEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTimestamp(event.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getThreatIcon(event.action.replace("SECURITY_", ""))}
                        <span className="ml-2 text-sm font-medium text-gray-900">
                          {event.action.replace("SECURITY_", "").replace("_", " ")}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(event.metadata?.severity)}`}>
                        {event.metadata?.severity || "Unknown"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {event.metadata?.ipAddress || "Unknown"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {event.metadata?.reasons && (
                        <div className="space-y-1">
                          {event.metadata.reasons.map((reason: string, index: number) => (
                            <div key={index} className="text-xs text-gray-600">
                              • {reason}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}