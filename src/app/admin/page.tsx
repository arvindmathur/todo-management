"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface AdminStats {
  users: {
    total: number;
    active: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
    withEmailNotifications: number;
  };
  tasks: {
    total: number;
    active: number;
    completed: number;
    overdue: number;
    createdToday: number;
    completedToday: number;
  };
  emails: {
    pending: number;
    sent: number;
    failed: number;
    cancelled: number;
    totalToday: number;
    failureRate: number;
    recentFailures: Array<{
      id: string;
      type: string;
      errorMessage: string;
      retryCount: number;
      updatedAt: string;
      user: { email: string };
    }>;
  };
  system: {
    timestamp: string;
    timezone: string;
  };
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    fetchStats();
  }, [session, status, router]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/stats");
      
      if (!response.ok) {
        if (response.status === 403) {
          setError("Admin access required");
          return;
        }
        throw new Error("Failed to fetch stats");
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) return;

    try {
      setTestEmailLoading(true);
      setTestEmailResult(null);

      const response = await fetch("/api/email/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to: testEmail }),
      });

      const result = await response.json();
      
      if (result.success) {
        setTestEmailResult("✅ Test email sent successfully!");
      } else {
        setTestEmailResult(`❌ Failed: ${result.error || "Unknown error"}`);
      }
    } catch (err) {
      setTestEmailResult(`❌ Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setTestEmailLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ {error}</div>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">System overview and email monitoring</p>
          <div className="mt-4 flex gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              ← Back to Dashboard
            </button>
            <button
              onClick={fetchStats}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              🔄 Refresh Stats
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* User Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">👥 Users</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Users:</span>
                <span className="font-semibold">{stats.users.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Active Users:</span>
                <span className="font-semibold text-green-600">{stats.users.active}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">New Today:</span>
                <span className="font-semibold">{stats.users.newToday}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">New This Week:</span>
                <span className="font-semibold">{stats.users.newThisWeek}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Email Notifications:</span>
                <span className="font-semibold">{stats.users.withEmailNotifications}</span>
              </div>
            </div>
          </div>

          {/* Task Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Tasks</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Tasks:</span>
                <span className="font-semibold">{stats.tasks.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Active:</span>
                <span className="font-semibold text-blue-600">{stats.tasks.active}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Completed:</span>
                <span className="font-semibold text-green-600">{stats.tasks.completed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Overdue:</span>
                <span className="font-semibold text-red-600">{stats.tasks.overdue}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Created Today:</span>
                <span className="font-semibold">{stats.tasks.createdToday}</span>
              </div>
            </div>
          </div>

          {/* Email Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📧 Email Notifications</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Pending:</span>
                <span className="font-semibold text-yellow-600">{stats.emails.pending}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sent:</span>
                <span className="font-semibold text-green-600">{stats.emails.sent}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Failed:</span>
                <span className="font-semibold text-red-600">{stats.emails.failed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Today's Total:</span>
                <span className="font-semibold">{stats.emails.totalToday}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Failure Rate:</span>
                <span className={`font-semibold ${stats.emails.failureRate > 10 ? 'text-red-600' : 'text-green-600'}`}>
                  {stats.emails.failureRate}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Test Email Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🧪 Test Email Configuration</h3>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label htmlFor="testEmail" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="testEmail"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Enter email address to test"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={sendTestEmail}
              disabled={!testEmail || testEmailLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testEmailLoading ? "Sending..." : "Send Test Email"}
            </button>
          </div>
          {testEmailResult && (
            <div className="mt-4 p-3 rounded-md bg-gray-50">
              <p className="text-sm">{testEmailResult}</p>
            </div>
          )}
        </div>

        {/* Recent Failed Emails */}
        {stats.emails.recentFailures.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">⚠️ Recent Email Failures</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Error
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Retries
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.emails.recentFailures.map((failure) => (
                    <tr key={failure.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {failure.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {failure.user.email}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {failure.errorMessage}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {failure.retryCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(failure.updatedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* System Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          Last updated: {new Date(stats.system.timestamp).toLocaleString()} ({stats.system.timezone})
        </div>
      </div>
    </div>
  );
}