'use client';

import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { api, ExperimentResponse, StatsResponse } from '@/lib/api';
import { formatRelativeTime, getOutcomeColor, truncate } from '@/lib/utils';
import {
  FlaskConical,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Lightbulb,
  Clock,
  Brain,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

interface StatsData {
  total_experiments: number;
  successful: number;
  failed: number;
  partial: number;
  unknown: number;
  lessons_learned: number;
  recent_experiments: ExperimentResponse[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await api.getStats();
        setStats(data);
      } catch (err) {
        setError('Failed to load dashboard data. Is the backend running?');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-dark-200 rounded w-1/4" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="card p-6 h-32 bg-dark-200 rounded" />
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="card p-8 text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Retry
          </button>
        </div>
      </Layout>
    );
  }

  const statCards = [
    { label: 'Total Experiments', value: stats?.total_experiments ?? 0, icon: FlaskConical, color: 'text-primary-600 bg-primary-100' },
    { label: 'Successful', value: stats?.successful ?? 0, icon: CheckCircle2, color: 'text-green-600 bg-green-100' },
    { label: 'Failed', value: stats?.failed ?? 0, icon: XCircle, color: 'text-red-600 bg-red-100' },
    { label: 'Lessons Learned', value: stats?.lessons_learned ?? 0, icon: Lightbulb, color: 'text-yellow-600 bg-yellow-100' },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-dark-900">Dashboard</h1>
            <p className="text-dark-500 mt-1">Overview of your experiment memory</p>
          </div>
          <Link href="/record" className="btn-primary">
            <FlaskConical className="w-5 h-5" />
            Record Experiment
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => (
            <div key={stat.label} className="card p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-dark-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-dark-900 mt-1">{stat.value}</p>
                </div>
                <div className={cn('p-3 rounded-xl', stat.color)}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="p-6 border-b border-dark-200">
              <h2 className="text-lg font-semibold text-dark-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-dark-500" />
                Recent Experiments
              </h2>
            </div>
            <div className="divide-y divide-dark-200">
              {stats?.recent_experiments.length === 0 ? (
                <div className="p-8 text-center text-dark-500">
                  <FlaskConical className="w-12 h-12 mx-auto text-dark-300 mb-3" />
                  <p>No experiments recorded yet</p>
                  <Link href="/record" className="text-primary-600 hover:underline mt-2 inline-block">
                    Record your first experiment
                  </Link>
                </div>
              ) : (
                stats?.recent_experiments.map((exp) => (
                  <Link
                    key={exp.id}
                    href={`/history/${exp.id}`}
                    className="p-4 hover:bg-dark-50 transition-colors flex items-center gap-4"
                  >
                    <div className={cn('p-2 rounded-lg', getOutcomeColor(exp.outcome))}>
                      <FlaskConical className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-dark-900 truncate">{exp.title}</p>
                      <p className="text-sm text-dark-500 truncate">{truncate(exp.lesson, 80)}</p>
                    </div>
                    <div className="text-right">
                      <span className={cn('badge', getOutcomeColor(exp.outcome))}>
                        {exp.outcome}
                      </span>
                      <p className="text-xs text-dark-400 mt-1">{formatRelativeTime(exp.timestamp)}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <div className="p-6 border-b border-dark-200">
              <h2 className="text-lg font-semibold text-dark-900 flex items-center gap-2">
                <Brain className="w-5 h-5 text-dark-500" />
                Memory Activity
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-dark-500">Total Memories Stored</p>
                  <p className="text-2xl font-bold text-dark-900">{stats?.total_experiments ?? 0}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-lg bg-green-50">
                  <p className="text-2xl font-bold text-green-600">{stats?.successful ?? 0}</p>
                  <p className="text-xs text-green-600">Successful</p>
                </div>
                <div className="p-3 rounded-lg bg-red-50">
                  <p className="text-2xl font-bold text-red-600">{stats?.failed ?? 0}</p>
                  <p className="text-xs text-red-600">Failed</p>
                </div>
                <div className="p-3 rounded-lg bg-yellow-50">
                  <p className="text-2xl font-bold text-yellow-600">{stats?.partial ?? 0}</p>
                  <p className="text-xs text-yellow-600">Partial</p>
                </div>
              </div>
              <div className="pt-4 border-t border-dark-200">
                <p className="text-sm text-dark-500">
                  {stats?.lessons_learned ?? 0} lessons extracted from experiments
                </p>
                <Link href="/explore" className="text-primary-600 hover:underline text-sm font-medium inline-block mt-2">
                  Explore memory →
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-dark-900 mb-4 flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-dark-500" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/preflight" className="card p-4 hover:shadow-md transition-shadow border-primary-200 border-2">
              <Zap className="w-6 h-6 text-primary-600 mb-2" />
              <h3 className="font-medium text-dark-900">Run Preflight</h3>
              <p className="text-sm text-dark-500 mt-1">Check proposed experiment against historical memory</p>
            </Link>
            <Link href="/record" className="card p-4 hover:shadow-md transition-shadow">
              <FlaskConical className="w-6 h-6 text-green-600 mb-2" />
              <h3 className="font-medium text-dark-900">Record Experiment</h3>
              <p className="text-sm text-dark-500 mt-1">Add a new experiment to memory</p>
            </Link>
            <Link href="/explore" className="card p-4 hover:shadow-md transition-shadow">
              <Search className="w-6 h-6 text-blue-600 mb-2" />
              <h3 className="font-medium text-dark-900">Search Memory</h3>
              <p className="text-sm text-dark-500 mt-1">Query past experiments and lessons</p>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}