'use client';

import { useDashboardMetrics } from '@/hooks/useDashboard';
import { MessageSquare, AlertCircle, TrendingUp, BarChart3 } from 'lucide-react';

function MetricCard({
  title,
  value,
  icon: Icon,
  color,
  description,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  description?: string;
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-sm font-medium text-gray-600">{title}</p>
      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { data: metrics, isLoading } = useDashboardMetrics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Failed to load metrics</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Overview of your messaging activity</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Conversations"
            value={metrics.totalConversations}
            icon={MessageSquare}
            color="bg-blue-100 text-blue-600"
          />
          <MetricCard
            title="Unreplied Messages"
            value={metrics.totalUnreplied}
            icon={AlertCircle}
            color="bg-red-100 text-red-600"
            description="Needs attention"
          />
          <MetricCard
            title="High Priority"
            value={metrics.priorityBreakdown.high}
            icon={TrendingUp}
            color="bg-orange-100 text-orange-600"
            description="Urgent conversations"
          />
          <MetricCard
            title="Unanalyzed"
            value={metrics.priorityBreakdown.unanalyzed}
            icon={BarChart3}
            color="bg-gray-100 text-gray-600"
            description="Pending AI analysis"
          />
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Priority Breakdown</h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">High Priority</span>
                <span className="text-sm font-semibold text-gray-900">
                  {metrics.priorityBreakdown.high}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full"
                  style={{
                    width: `${
                      (metrics.priorityBreakdown.high / metrics.totalConversations) * 100
                    }%`,
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Medium Priority</span>
                <span className="text-sm font-semibold text-gray-900">
                  {metrics.priorityBreakdown.medium}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-600 h-2 rounded-full"
                  style={{
                    width: `${
                      (metrics.priorityBreakdown.medium / metrics.totalConversations) * 100
                    }%`,
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Low Priority</span>
                <span className="text-sm font-semibold text-gray-900">
                  {metrics.priorityBreakdown.low}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{
                    width: `${
                      (metrics.priorityBreakdown.low / metrics.totalConversations) * 100
                    }%`,
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Not Analyzed</span>
                <span className="text-sm font-semibold text-gray-900">
                  {metrics.priorityBreakdown.unanalyzed}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gray-400 h-2 rounded-full"
                  style={{
                    width: `${
                      (metrics.priorityBreakdown.unanalyzed / metrics.totalConversations) * 100
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
