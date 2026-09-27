import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

export function getOutcomeColor(outcome: string): string {
  switch (outcome) {
    case 'success': return 'text-green-600 bg-green-100';
    case 'failure': return 'text-red-600 bg-red-100';
    case 'partial': return 'text-yellow-600 bg-yellow-100';
    default: return 'text-dark-600 bg-dark-100';
  }
}

export function getRecommendationColor(rec: string): string {
  switch (rec) {
    case 'proceed_with_controlled_test': return 'text-green-600 bg-green-100';
    case 'proceed_with_caution': return 'text-yellow-600 bg-yellow-100';
    case 'gather_more_evidence': return 'text-blue-600 bg-blue-100';
    case 'avoid_repeating_under_current_conditions': return 'text-red-600 bg-red-100';
    default: return 'text-dark-600 bg-dark-100';
  }
}

export function getRecommendationLabel(rec: string): string {
  switch (rec) {
    case 'proceed_with_controlled_test': return 'Proceed with Controlled Test';
    case 'proceed_with_caution': return 'Proceed with Caution';
    case 'gather_more_evidence': return 'Gather More Evidence';
    case 'avoid_repeating_under_current_conditions': return 'Avoid Under Current Conditions';
    default: return rec;
  }
}

export function getSimilarityColor(similarity: string): string {
  switch (similarity) {
    case 'identical': return 'text-green-600 bg-green-100';
    case 'very_similar': return 'text-green-600 bg-green-100';
    case 'similar': return 'text-blue-600 bg-blue-100';
    case 'moderately_different': return 'text-yellow-600 bg-yellow-100';
    case 'significantly_different': return 'text-orange-600 bg-orange-100';
    case 'different': return 'text-red-600 bg-red-100';
    case 'missing_in_historical': return 'text-dark-400 bg-dark-100';
    case 'missing_in_current': return 'text-dark-400 bg-dark-100';
    default: return 'text-dark-600 bg-dark-100';
  }
}

export function getSimilarityLabel(similarity: string): string {
  return similarity.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}