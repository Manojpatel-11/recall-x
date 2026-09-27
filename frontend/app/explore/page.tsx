'use client';

import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { api, RecallRequest, RecallResponse } from '@/lib/api';
import { formatRelativeTime, getOutcomeColor, truncate } from '@/lib/utils';
import {
  Search,
  Loader2,
  FileText,
  Filter,
  X,
  Tag,
  Brain,
} from 'lucide-react';

export default function ExplorePage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RecallResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(10);
  const [suggestions] = useState([
    'API timeout',
    'connection pool',
    'database optimization',
    'caching',
    'Kafka consumer',
    'request hedging',
    'async driver',
    'Redis',
  ]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setError(null);
    setLoading(true);

    try {
      const data = await api.recallMemory({ query, limit });
      setResults(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    handleSearch(new Event('submit'));
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-dark-900 flex items-center gap-3">
            <Brain className="w-8 h-8 text-purple-600" />
            Memory Explorer
          </h1>
          <p className="text-dark-500 mt-2">
            Search historical experiments and lessons. RECALL-X uses multi-strategy retrieval
            (semantic, keyword, graph, temporal) to find relevant memories.
          </p>
        </div>

        <form onSubmit={handleSearch} className="card p-6 mb-8">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(e as any)}
                className="input pl-10"
                placeholder="Search experiments... (e.g., 'timeout connection pool')"
                disabled={loading}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading || !query.trim()}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSuggestionClick(s)}
                className="text-sm px-3 py-1.5 rounded-lg bg-dark-100 text-dark-600 hover:bg-dark-200 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </form>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
            {error}
          </div>
        )}

        {results && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-dark-500">
              <span>{results.total} memory{results.total !== 1 ? 's' : ''} found</span>
              <span className="badge badge-info">Limit: {limit}</span>
            </div>

            {results.memories.length === 0 ? (
              <div className="card p-12 text-center">
                <FileText className="w-16 h-16 mx-auto text-dark-300 mb-4" />
                <h3 className="text-lg font-medium text-dark-700 mb-2">No memories found</h3>
                <p className="text-dark-500">Try a different search query or record some experiments first.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.memories.map((memory, index) => (
                  <MemoryCard key={memory.id} memory={memory} index={index} />
                ))}
              </div>
            )}
          </div>
        )}

        {!results && !loading && (
          <div className="card p-12 text-center">
            <Brain className="w-16 h-16 mx-auto text-dark-300 mb-4" />
            <h3 className="text-lg font-medium text-dark-700 mb-2">Explore Your Memory</h3>
            <p className="text-dark-500 max-w-md mx-auto">
              Enter a search query above to recall relevant experiments from Hindsight memory.
              The system uses semantic search, keyword matching, graph traversal, and temporal relevance.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}

function MemoryCard({ memory, index }: { memory: RecallResponse['memories'][0]; index: number }) {
  const meta = memory.metadata;
  const outcomeColor = getOutcomeColor(meta.outcome || 'unknown');

  return (
    <div className="card p-4 hover:shadow-md transition-shadow border-l-4" style={{ borderColor: outcomeColor.replace('bg-', '').replace('text-', '') }}>
      <div className="flex items-start gap-4">
        <div className={cn('p-2 rounded-lg flex-shrink-0', outcomeColor)}>
          <FileText className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-dark-900 truncate">{meta.title || 'Untitled Experiment'}</h4>
            <span className={cn('badge', outcomeColor)}>{meta.outcome || 'unknown'}</span>
            <span className="badge badge-info">{(memory.score * 100).toFixed(0)}% match</span>
          </h4>
          <p className="text-sm text-dark-600 mb-2 line-clamp-2">{truncate(memory.text, 200)}</p>
          <div className="flex flex-wrap gap-1">
            {meta.tags?.map((tag: string) => (
              <span key={tag} className="badge badge-neutral text-xs">{tag}</span>
            ))}
            {meta.domain && (
              <span className="badge badge-info text-xs">{meta.domain}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}