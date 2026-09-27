'use client';

import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { api, ExperimentCreate, OutcomeType } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  FlaskConical,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MinusCircle,
  HelpCircle,
} from 'lucide-react';

const OUTCOME_OPTIONS: { value: OutcomeType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'success', label: 'Success', icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-green-600 bg-green-100' },
  { value: 'failure', label: 'Failure', icon: <XCircle className="w-4 h-4" />, color: 'text-red-600 bg-red-100' },
  { value: 'partial', label: 'Partial', icon: <MinusCircle className="w-4 h-4" />, color: 'text-yellow-600 bg-yellow-100' },
  { value: 'unknown', label: 'Unknown', icon: <HelpCircle className="w-4 h-4" />, color: 'text-dark-600 bg-dark-100' },
];

const DEFAULT_CONDITIONS = `{
  "traffic_rpm": 1000,
  "connection_pool": 100,
  "api_provider": "internal",
  "deployment": "k8s-prod"
}`;

export default function RecordPage() {
  const [formData, setFormData] = useState<ExperimentCreate>({
    title: '',
    situation: '',
    hypothesis: '',
    action: '',
    conditions: {},
    observation: '',
    outcome: 'unknown',
    side_effects: [],
    decision: '',
    lesson: '',
    domain: 'general',
    tags: [],
    confidence: 0.5,
  });
  const [conditionsText, setConditionsText] = useState(DEFAULT_CONDITIONS);
  const [sideEffectsText, setSideEffectsText] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    let conditions: Record<string, any>;
    try {
      conditions = JSON.parse(conditionsText);
    } catch {
      setError('Conditions must be valid JSON');
      setLoading(false);
      return;
    }

    const sideEffects = sideEffectsText.split('\n').map(s => s.trim()).filter(Boolean);
    const tags = tagsText.split(',').map(s => s.trim()).filter(Boolean);

    const data: ExperimentCreate = {
      ...formData,
      conditions,
      side_effects: sideEffects,
      tags,
    };

    try {
      await api.createExperiment(data);
      setSuccess(true);
      setFormData({
        title: '',
        situation: '',
        hypothesis: '',
        action: '',
        conditions: {},
        observation: '',
        outcome: 'unknown',
        side_effects: [],
        decision: '',
        lesson: '',
        domain: 'general',
        tags: [],
        confidence: 0.5,
      });
      setConditionsText(DEFAULT_CONDITIONS);
      setSideEffectsText('');
      setTagsText('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save experiment');
    } finally {
      setLoading(false);
    }
  };

  const updateField = <K extends keyof ExperimentCreate>(field: K, value: ExperimentCreate[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-dark-900 flex items-center gap-3">
            <FlaskConical className="w-8 h-8 text-green-600" />
            Record Experiment
          </h1>
          <p className="text-dark-500 mt-2">
            Document an experiment for future preflight analysis. Include conditions, outcomes, and lessons learned.
          </p>
        </div>

        {success && (
          <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 flex items-center gap-3 text-green-700 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>Experiment recorded successfully! It's now in memory for future preflight checks.</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-center gap-3 text-red-700">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-dark-700 mb-2">Experiment Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                className="input"
                placeholder="e.g., Increase API timeout from 10s to 15s"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-dark-700 mb-2">Situation *</label>
              <textarea
                value={formData.situation}
                onChange={(e) => updateField('situation', e.target.value)}
                className="textarea"
                rows={3}
                placeholder="What was the context? What problem were you trying to solve?"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-dark-700 mb-2">Hypothesis *</label>
              <textarea
                value={formData.hypothesis}
                onChange={(e) => updateField('hypothesis', e.target.value)}
                className="textarea"
                rows={3}
                placeholder="What did you expect would happen?"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-dark-700 mb-2">Action Taken *</label>
              <textarea
                value={formData.action}
                onChange={(e) => updateField('action', e.target.value)}
                className="textarea"
                rows={3}
                placeholder="What exactly did you change/do?"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 mb-2">Conditions (JSON) *</label>
              <textarea
                value={conditionsText}
                onChange={(e) => setConditionsText(e.target.value)}
                className="textarea font-mono text-sm"
                rows={6}
                placeholder='{ "traffic_rpm": 1000, "connection_pool": 100, ... }'
                required
              />
              <p className="text-xs text-dark-400 mt-1">Key-value pairs describing the environment (traffic, pool size, versions, etc.)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 mb-2">Outcome *</label>
              <div className="grid grid-cols-4 gap-2">
                {OUTCOME_OPTIONS.map((opt) => (
                  <button
                    type="button"
                    onClick={() => updateField('outcome', opt.value)}
                    className={cn(
                      'p-3 rounded-lg border-2 text-center transition-all',
                      formData.outcome === opt.value
                        ? `border-${opt.color.split(' ')[1].replace('bg-', '')} bg-${opt.color.split(' ')[1].replace('bg-', '')}/20`
                        : 'border-dark-200 hover:border-dark-300'
                    )}
                  >
                    <div className={cn('mx-auto mb-1', opt.color)}>{opt.icon}</div>
                    <div className="text-sm font-medium text-dark-700">{opt.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-dark-700 mb-2">Observation</label>
              <textarea
                value={formData.observation}
                onChange={(e) => updateField('observation', e.target.value)}
                className="textarea"
                rows={4}
                placeholder="What actually happened? What did you observe?"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-dark-700 mb-2">Side Effects (one per line)</label>
              <textarea
                value={sideEffectsText}
                onChange={(e) => setSideEffectsText(e.target.value)}
                className="textarea"
                rows={4}
                placeholder="Connection pool exhaustion\nIncreased latency\nDownstream timeouts"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-dark-700 mb-2">Decision</label>
              <textarea
                value={formData.decision}
                onChange={(e) => updateField('decision', e.target.value)}
                className="textarea"
                rows={3}
                placeholder="What did you decide? (reverted, kept, modified, investigated further...)"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-dark-700 mb-2">Lesson Learned *</label>
              <textarea
                value={formData.lesson}
                onChange={(e) => updateField('lesson', e.target.value)}
                className="textarea"
                rows={4}
                placeholder="What did you learn? This is the most important field for future preflight analysis."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 mb-2">Domain</label>
              <input
                type="text"
                value={formData.domain}
                onChange={(e) => updateField('domain', e.target.value)}
                className="input"
                placeholder="e.g., api-configuration, database-optimization, caching, messaging"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 mb-2">Tags (comma-separated)</label>
              <input
                type="text"
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                className="input"
                placeholder="timeout, connection-pool, high-traffic, failure"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 mb-2">Confidence</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={formData.confidence}
                onChange={(e) => updateField('confidence', parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-dark-500 mt-1">
                <span>Low (0)</span>
                <span>Medium (0.5)</span>
                <span>High (1)</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-dark-200 flex justify-end gap-4">
            <button type="button" onClick={() => setSuccess(false)} className="btn-secondary">
              Clear
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Save className="w-5 h-5" />
                  Save to Memory
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}