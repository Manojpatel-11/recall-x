'use client';

import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { api, ExperimentResponse } from '@/lib/api';
import { formatDate, getOutcomeColor, cn } from '@/lib/utils';
import {
  ArrowLeft,
  FileText,
  Settings,
  Eye,
  AlertTriangle,
  Lightbulb,
  Tag,
  Clock,
  Hash,
  Share2,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

export default function ExperimentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [experiment, setExperiment] = useState<ExperimentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchExperiment() {
      const resolvedParams = await params;
      try {
        const data = await api.getExperiment(resolvedParams.id);
        setExperiment(data);
      } catch (err: any) {
        if (err.response?.status === 404) {
          setError('Experiment not found');
        } else {
          setError(err.response?.data?.detail || 'Failed to load experiment');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchExperiment();
  }, [params]);

  const copyToClipboard = async () => {
    if (!experiment) return;
    const text = `Experiment: ${experiment.title}\n\nSituation: ${experiment.situation}\n\nHypothesis: ${experiment.hypothesis}\n\nAction: ${experiment.action}\n\nConditions: ${JSON.stringify(experiment.conditions, null, 2)}\n\nObservation: ${experiment.observation}\n\nOutcome: ${experiment.outcome}\n\nSide Effects: ${experiment.side_effects.join(', ')}\n\nDecision: ${experiment.decision}\n\nLesson: ${experiment.lesson}\n\nDomain: ${experiment.domain}\n\nTags: ${experiment.tags.join(', ')}\n\nConfidence: ${experiment.confidence}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-dark-200 rounded w-1/3" />
          <div className="card p-6 h-64 bg-dark-200" />
        </div>
      </Layout>
    );
  }

  if (error || !experiment) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto text-center">
          <Link href="/history" className="btn-secondary mb-6 inline-flex">
            <ArrowLeft className="w-4 h-4" />
            Back to History
          </Link>
          <div className="card p-12">
            <FileText className="w-16 h-16 mx-auto text-dark-300 mb-4" />
            <h2 className="text-xl font-semibold text-dark-700 mb-2">Experiment Not Found</h2>
            <p className="text-dark-500">{error || 'The experiment could not be loaded.'}</p>
          </div>
        </div>
      </Layout>
    );
  }

  const outcomeColor = getOutcomeColor(experiment.outcome);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/history" className="btn-ghost p-2">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-dark-900">{experiment.title}</h1>
            <p className="text-dark-500 text-sm">{formatDate(experiment.timestamp)}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={copyToClipboard} className="btn-ghost p-2" title="Copy experiment details">
              {copied ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Section title="Situation" icon={<FileText className="w-5 h-5" />}>
              <p className="text-dark-700 whitespace-pre-wrap">{experiment.situation}</p>
            </Section>

            <Section title="Hypothesis" icon={<Lightbulb className="w-5 h-5" />}>
              <p className="text-dark-700 whitespace-pre-wrap">{experiment.hypothesis}</p>
            </Section>

            <Section title="Action Taken" icon={<Settings className="w-5 h-5" />}>
              <p className="text-dark-700 whitespace-pre-wrap">{experiment.action}</p>
            </Section>

            <Section title="Conditions" icon={<Settings className="w-5 h-5" />}>
              <pre className="bg-dark-900 text-dark-100 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                {JSON.stringify(experiment.conditions, null, 2)}
              </pre>
            </Section>

            <Section title="Observation" icon={<Eye className="w-5 h-5" />}>
              <p className="text-dark-700 whitespace-pre-wrap">{experiment.observation || 'No observation recorded'}</p>
            </Section>

            {experiment.side_effects.length > 0 && (
              <Section title="Side Effects" icon={<AlertTriangle className="w-5 h-5" />}>
                <ul className="space-y-1">
                  {experiment.side_effects.map((effect, i) => (
                    <li key={i} className="flex items-start gap-2 text-dark-700">
                      <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      <span>{effect}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Section title="Decision" icon={<Hash className="w-5 h-5" />}>
              <p className="text-dark-700 whitespace-pre-wrap">{experiment.decision || 'No decision recorded'}</p>
            </Section>

            <Section title="Lesson Learned" icon={<Lightbulb className="w-5 h-5" />} highlight>
              <p className="text-dark-900 whitespace-pre-wrap font-medium">{experiment.lesson}</p>
            </Section>
          </div>

          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="font-semibold text-dark-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-dark-500" />
                Metadata
              </h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-dark-500">Outcome</dt>
                  <dd className={cn('font-medium', outcomeColor)}>
                    {experiment.outcome}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-dark-500">Domain</dt>
                  <dd className="font-medium text-dark-900">{experiment.domain}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-dark-500">Confidence</dt>
                  <dd className="font-medium text-dark-900">{(experiment.confidence * 100).toFixed(0)}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-dark-500">Recorded</dt>
                  <dd className="font-medium text-dark-900">{formatDate(experiment.timestamp)}</dd>
                </div>
                {experiment.memory_id && (
                  <div className="flex justify-between">
                    <dt className="text-dark-500">Memory ID</dt>
                    <dd className="font-mono text-xs text-dark-600 truncate max-w-[150px]">{experiment.memory_id}</dd>
                  </div>
                )}
              </dl>
            </div>

            {experiment.tags.length > 0 && (
              <div className="card p-6">
                <h3 className="font-semibold text-dark-900 mb-3 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-dark-500" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {experiment.tags.map((tag) => (
                    <span key={tag} className="badge badge-info">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Section({ title, icon, children, highlight }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={cn('card p-6', highlight && 'border-l-4 border-yellow-400 bg-yellow-50')}>
      <h3 className="font-semibold text-dark-900 mb-3 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      <div>{children}</div>
    </div>
  );
}

