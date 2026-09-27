'use client';

import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { api, PreflightRequest, PreflightResponse, HistoricalEvidence, ConditionComparison } from '@/lib/api';
import { getRecommendationColor, getRecommendationLabel, getSimilarityColor, getSimilarityLabel, getOutcomeColor, formatDate } from '@/lib/utils';
import {
  Zap,
  Send,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  FileText,
  Settings,
  ChevronDown,
  ChevronUp,
  Shield,
  Beaker,
  Lightbulb,
} from 'lucide-react';

const DEFAULT_PROPOSED_ACTION = "Increase API timeout from 10s to 15s";
const DEFAULT_CONDITIONS = `{
  "traffic_rpm": 700,
  "connection_pool": 150,
  "api_provider": "internal",
  "deployment": "k8s-staging"
}`;
const DEFAULT_CONTEXT = "Planning to increase timeout for better handling of slow downstream responses. Current traffic is lower than historical peak.";

export default function PreflightPage() {
  const [proposedAction, setProposedAction] = useState(DEFAULT_PROPOSED_ACTION);
  const [currentConditions, setCurrentConditions] = useState(DEFAULT_CONDITIONS);
  const [context, setContext] = useState(DEFAULT_CONTEXT);
  const [result, setResult] = useState<PreflightResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    evidence: true,
    comparison: true,
    reasoning: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setResult(null);

    let conditions: Record<string, any>;
    try {
      conditions = JSON.parse(currentConditions);
    } catch {
      setError('Current conditions must be valid JSON');
      setLoading(false);
      return;
    }

    const request: PreflightRequest = {
      proposed_action: proposedAction,
      current_conditions: conditions,
      context: context,
    };

    try {
      const data = await api.runPreflight(request);
      setResult(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Preflight analysis failed. Check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (!result) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-dark-900 flex items-center gap-3">
              <Zap className="w-8 h-8 text-primary-600" />
              Experiment Preflight
            </h1>
            <p className="text-dark-500 mt-2">
              Before you run an experiment, RECALL-X checks historical memory for similar experiments,
              compares conditions, and provides a condition-aware recommendation.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="card p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-2">
                Proposed Experiment
              </label>
              <textarea
                value={proposedAction}
                onChange={(e) => setProposedAction(e.target.value)}
                className="textarea"
                rows={3}
                placeholder="Describe the experiment you're planning to run..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 mb-2">
                Current Conditions (JSON)
              </label>
              <textarea
                value={currentConditions}
                onChange={(e) => setCurrentConditions(e.target.value)}
                className="textarea font-mono text-sm"
                rows={8}
                placeholder='{ "traffic_rpm": 700, "connection_pool": 150, ... }'
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 mb-2">
                Additional Context (Optional)
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="textarea"
                rows={3}
                placeholder="Any additional context about why you're running this experiment now..."
              />
            </div>

            {error && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-center gap-3 text-red-700">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="btn-primary w-full py-3 text-lg" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Send className="w-5 h-5" />
                  Run Preflight Analysis
                </span>
              )}
            </button>
          </form>

          <div className="mt-8 card p-6">
            <h2 className="font-semibold text-dark-900 mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-600" />
              Demo Scenario
            </h2>
            <p className="text-dark-600 text-sm mb-4">
              The form above is pre-filled with a demo scenario. Try it to see how RECALL-X works:
            </p>
            <ul className="text-sm text-dark-600 space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <strong>Historical:</strong> 15s timeout failed at 2000 rpm with pool=50 (connection pool exhaustion)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <strong>Current:</strong> 15s timeout proposed at 700 rpm with pool=150
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <strong>Expected:</strong> RECALL-X retrieves the failure, compares conditions, and explains why the historical failure may not apply
              </li>
            </ul>
          </div>
        </div>
      </Layout>
    );
  }

  const recommendation = result.recommendation;
  const recommendationColor = getRecommendationColor(recommendation);
  const recommendationLabel = getRecommendationLabel(recommendation);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-dark-900 flex items-center gap-3">
              <Zap className="w-8 h-8 text-primary-600" />
              Preflight Result
            </h1>
            <p className="text-dark-500 mt-1">Analysis for: <span className="font-mono text-dark-900">{proposedAction}</span></p>
          </div>
          <button onClick={() => setResult(null)} className="btn-secondary">
            New Analysis
          </button>
        </div>

        <div className={cn('card p-6', `border-l-4 ${recommendationColor.replace('bg-', 'bg-').replace('text-', 'border-')}`)}>
          <div className="flex items-center gap-4">
            <div className={cn('p-3 rounded-xl', recommendationColor)}>
              {recommendation === 'avoid_repeating_under_current_conditions' && <XCircle className="w-8 h-8" />}
              {recommendation === 'proceed_with_controlled_test' && <CheckCircle2 className="w-8 h-8" />}
              {recommendation === 'proceed_with_caution' && <AlertTriangle className="w-8 h-8" />}
              {recommendation === 'gather_more_evidence' && <Info className="w-8 h-8" />}
            </div>
            <div>
              <p className="text-sm text-dark-500">Recommendation</p>
              <p className={cn('text-xl font-bold', recommendationColor.replace('bg-', 'text-'))}>
                {recommendationLabel}
              </p>
              <p className="text-sm text-dark-500 mt-1">
                Confidence: <span className="font-medium text-dark-900">{(result.confidence * 100).toFixed(0)}%</span>
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <SectionCard
              title="Reasoning"
              icon={<Brain className="w-5 h-5" />}
              expanded={expandedSections.reasoning}
              onToggle={() => toggleSection('reasoning')}
            >
              <div className="prose prose-dark max-w-none">
                <p className="text-dark-700">{result.reasoning}</p>
              </div>
            </SectionCard>

            <SectionCard
              title="Historical Evidence"
              icon={<FileText className="w-5 h-5" />}
              expanded={expandedSections.evidence}
              onToggle={() => toggleSection('evidence')}
            >
              {result.historical_evidence.length === 0 ? (
                <p className="text-dark-500 text-center py-8">No relevant historical experiments found.</p>
              ) : (
                <div className="space-y-4">
                  {result.historical_evidence.map((evidence: HistoricalEvidence, index: number) => (
                    <EvidenceCard key={evidence.experiment_id} evidence={evidence} index={index} />
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Condition Comparison"
              icon={<Settings className="w-5 h-5" />}
              expanded={expandedSections.comparison}
              onToggle={() => toggleSection('comparison')}
            >
              {result.condition_comparison.length === 0 ? (
                <p className="text-dark-500 text-center py-8">No conditions to compare.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-dark-200">
                        <th className="text-left p-3 font-medium text-dark-500">Condition</th>
                        <th className="text-left p-3 font-medium text-dark-500">Historical</th>
                        <th className="text-left p-3 font-medium text-dark-500">Current</th>
                        <th className="text-left p-3 font-medium text-dark-500">Similarity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.condition_comparison.map((comp: ConditionComparison, i: number) => (
                        <tr key={i} className="border-b border-dark-100 hover:bg-dark-50">
                          <td className="p-3 font-mono text-dark-700">{comp.condition}</td>
                          <td className="p-3 font-mono text-dark-600">{JSON.stringify(comp.historical_value)}</td>
                          <td className="p-3 font-mono text-dark-900">{JSON.stringify(comp.current_value)}</td>
                          <td className="p-3">
                            <span className={cn('badge', getSimilarityColor(comp.similarity))}>
                              {getSimilarityLabel(comp.similarity)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </div>

          <div className="space-y-6">
            <SectionCard
              title="Risks & Side Effects"
              icon={<Shield className="w-5 h-5" />}
              expanded={true}
            >
              {result.risks.length === 0 ? (
                <p className="text-dark-500 text-center py-4">No known risks from historical data.</p>
              ) : (
                <ul className="space-y-2">
                  {result.risks.map((risk, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-dark-700">
                      <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard
              title="Suggested Test"
              icon={<Beaker className="w-5 h-5" />}
              expanded={true}
            >
              <div className="p-4 bg-primary-50 rounded-lg border border-primary-100">
                <p className="text-dark-800">{result.suggested_test || 'No specific test suggested.'}</p>
              </div>
            </SectionCard>

            <SectionCard
              title="Evidence Classification"
              icon={<Lightbulb className="w-5 h-5" />}
              expanded={true}
            >
              <div className="space-y-4">
                <EvidenceCategory
                  title="Known from Memory"
                  items={result.known_from_memory}
                  icon={<CheckCircle2 className="w-4 h-4 text-green-600" />}
                  color="green"
                />
                <EvidenceCategory
                  title="Inference"
                  items={result.inference}
                  icon={<Info className="w-4 h-4 text-blue-600" />}
                  color="blue"
                />
                <EvidenceCategory
                  title="Unknown"
                  items={result.unknown}
                  icon={<AlertTriangle className="w-4 h-4 text-yellow-600" />}
                  color="yellow"
                />
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function SectionCard({ title, icon, children, expanded, onToggle }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className="card">
      <div className="p-4 border-b border-dark-200 flex items-center justify-between">
        <h3 className="font-semibold text-dark-900 flex items-center gap-2">
          {icon}
          {title}
        </h3>
        {onToggle && (
          <button
            onClick={onToggle}
            className="p-1 text-dark-400 hover:text-dark-600 transition-colors"
            aria-label={expanded ? `Collapse ${title}` : `Expand ${title}`}
          >
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        )}
      </div>
      <div className={cn(expanded === false ? 'hidden' : 'p-4')}>
        {children}
      </div>
    </div>
  );
}

function EvidenceCard({ evidence, index }: { evidence: HistoricalEvidence; index: number }) {
  const outcomeColor = getOutcomeColor(evidence.outcome);
  return (
    <div className="card p-4 border-l-4" style={{ borderColor: outcomeColor.replace('bg-', '').replace('text-', '') }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-dark-900">{evidence.title}</span>
            <span className={cn('badge', outcomeColor)}>{evidence.outcome}</span>
            <span className="badge badge-info">{(evidence.similarity_score * 100).toFixed(0)}% similar</span>
          </div>
          <p className="text-sm text-dark-600 mb-2">{evidence.lesson}</p>
          {evidence.side_effects.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {evidence.side_effects.map((se, i) => (
                <span key={i} className="badge badge-neutral text-xs">{se}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EvidenceCategory({ title, items, icon, color }: {
  title: string;
  items: string[];
  icon: React.ReactNode;
  color: 'green' | 'blue' | 'yellow';
}) {
  if (items.length === 0) return null;

  const colors = {
    green: 'bg-green-50 border-green-100 text-green-800',
    blue: 'bg-blue-50 border-blue-100 text-blue-800',
    yellow: 'bg-yellow-50 border-yellow-100 text-yellow-800',
  };

  return (
    <div className={cn('rounded-lg border p-3', colors[color])}>
      <div className="flex items-center gap-2 font-medium mb-2">
        {icon}
        <span>{title}</span>
      </div>
      <ul className="space-y-1 text-sm">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: `var(--color-${color}-600)` }} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}