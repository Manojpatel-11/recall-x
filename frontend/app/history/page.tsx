'use client';

import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { api, ExperimentResponse } from '@/lib/api';
import { formatRelativeTime, getOutcomeColor, truncate } from '@/lib/utils';
import {
  History,
  Loader2,
  FileText,
  Filter,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from 'lucide-react';
import Link from 'next/link';

export default function HistoryPage() {
  const [experiments, setExperiments] = useState<ExperimentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'success' | 'failure' | 'partial'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    async function fetchExperiments() {
      try {
        setLoading(true);
        const data = await api.listExperiments(1000);
        setExperiments(data.experiments);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load experiments');
      } finally {
        setLoading(false);
      }
    }
    fetchExperiments();
  }, []);

  const filteredExperiments = experiments.filter(exp => {
    if (filter !== 'all' && exp.outcome !== filter) return false;
    if (searchQuery && !exp.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !exp.lesson.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredExperiments.length / pageSize);
  const paginatedExperiments = filteredExperiments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const outcomeCounts = {
    all: experiments.length,
    success: experiments.filter(e => e.outcome === 'success').length,
    failure: experiments.filter(e => e.outcome === 'failure').length,
    partial: experiments.filter(e => e.outcome === 'partial').length,
  };

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-dark-200 rounded w-1/3" />
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="card p-4 h-20 bg-dark-200" />)}
          </div>
          {[1,2,3].map(i => <div key={i} className="card p-4 h-24 bg-dark-200" />)}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-dark-900 flex items-center gap-3">
            <History className="w-8 h-8 text-blue-600" />
            Experiment History
          </h1>
          <p className="text-dark-500 mt-2">Browse all recorded experiments chronologically</p>
        </div>

        <div className="card p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="input pl-10"
                placeholder="Search by title or lesson..."
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              {(['all', 'success', 'failure', 'partial'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => { setFilter(f); setCurrentPage(1); }}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    filter === f
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-100 text-dark-600 hover:bg-dark-200'
                  )}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)} ({outcomeCounts[f]})
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
            {error}
          </div>
        )}

        {filteredExperiments.length === 0 ? (
          <div className="card p-12 text-center">
            <FileText className="w-16 h-16 mx-auto text-dark-300 mb-4" />
            <h3 className="text-lg font-medium text-dark-700 mb-2">No experiments found</h3>
            <p className="text-dark-500 mb-4">
              {searchQuery || filter !== 'all' ? 'Try adjusting your filters.' : 'No experiments recorded yet.'}
            </p>
            {(!searchQuery && filter === 'all') && (
              <Link href="/record" className="btn-primary inline-flex">
                <FileText className="w-4 h-4" />
                Record First Experiment
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {paginatedExperiments.map((exp) => (
                <Link
                  key={exp.id}
                  href={`/history/${exp.id}`}
                  className="card p-4 hover:shadow-md transition-shadow flex items-start gap-4 group"
                >
                  <div className={cn('p-3 rounded-xl flex-shrink-0', getOutcomeColor(exp.outcome))}>
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-dark-900 group-hover:text-primary-600 transition-colors">
                        {exp.title}
                      </h3>
                      <span className={cn('badge', getOutcomeColor(exp.outcome))}>
                        {exp.outcome}
                      </span>
                      <span className="badge badge-neutral">{exp.domain}</span>
                    </div>
                    <p className="text-sm text-dark-600 mb-2 line-clamp-2">{truncate(exp.lesson, 150)}</p>
                    <div className="flex flex-wrap gap-1">
                      {exp.tags?.slice(0, 4).map((tag) => (
                        <span key={tag} className="badge badge-neutral text-xs">{tag}</span>
                      ))}
                      {exp.tags && exp.tags.length > 4 && (
                        <span className="badge badge-neutral text-xs">+{exp.tags.length - 4} more</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm text-dark-500 flex-shrink-0">
                    <p>{formatRelativeTime(exp.timestamp)}</p>
                    <p className="text-xs">Confidence: {(exp.confidence * 100).toFixed(0)}%</p>
                  </div>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn-secondary"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-dark-600 px-4">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="btn-secondary"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}