import { WellbeingMetrics } from '@/data/wellbeing/types';

// Metric definitions with weighting and direction
export const METRIC_DEFINITIONS = {
  anxiety: { weight: 1, higherIsGood: false, label: 'Anxiety' },
  stress: { weight: 1, higherIsGood: false, label: 'Stress' },
  irritability: { weight: 1, higherIsGood: false, label: 'Irritability' },
  overwhelm: { weight: 1, higherIsGood: false, label: 'Overwhelm' },
  energy: { weight: 1, higherIsGood: true, label: 'Energy Level' },
  intimacy: { weight: 1, higherIsGood: true, label: 'Intimacy Desire' },
  physical_touch: { weight: 1, higherIsGood: true, label: 'Physical Touch Need' },
  emotional_support: { weight: 1, higherIsGood: true, label: 'Emotional Support Need' },
} as const;

// Compute overall wellbeing score from metrics (0-100)
export const computeWellbeingScore = (metrics: Partial<WellbeingMetrics>): number => {
  const totalWeight = Object.values(METRIC_DEFINITIONS).reduce((acc, def) => acc + def.weight, 0);
  
  const subtotal = Object.entries(METRIC_DEFINITIONS).reduce((sum, [key, def]) => {
    const rawValue = metrics[key as keyof WellbeingMetrics] ?? 50; // Default to neutral 50
    const normalizedValue = def.higherIsGood ? rawValue : 100 - rawValue;
    return sum + (normalizedValue * def.weight);
  }, 0);
  
  return Math.round(subtotal / totalWeight);
};

// Get color for wellbeing score based on thresholds
export const getWellbeingColor = (score: number): string => {
  if (score >= 70) return 'hsl(var(--wellbeing-great))';
  if (score >= 50) return 'hsl(var(--wellbeing-good))';  
  if (score >= 40) return 'hsl(var(--wellbeing-fair))';
  return 'hsl(var(--wellbeing-attention))';
};

// Get CSS class for wellbeing score
export const getWellbeingColorClass = (score: number): string => {
  if (score >= 70) return 'bg-wellbeing-great';
  if (score >= 50) return 'bg-wellbeing-good';
  if (score >= 40) return 'bg-wellbeing-fair';
  return 'bg-wellbeing-attention';
};

// Get status text for wellbeing score
export const getWellbeingStatus = (score: number): string => {
  if (score >= 70) return 'Great';
  if (score >= 50) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs Attention';
};

// Get friendly description for metric value
export const getMetricDescription = (key: keyof WellbeingMetrics, value: number): string => {
  const isNegativeMetric = !METRIC_DEFINITIONS[key].higherIsGood;
  
  let level: string;
  if (value >= 75) {
    level = isNegativeMetric ? 'Very High' : 'Very High';
  } else if (value >= 50) {
    level = isNegativeMetric ? 'High' : 'High';
  } else if (value >= 25) {
    level = isNegativeMetric ? 'Low' : 'Low';
  } else {
    level = isNegativeMetric ? 'Very Low' : 'Very Low';
  }
  
  return `${METRIC_DEFINITIONS[key].label}: ${level}`;
};

// Transform metrics for display with friendly labels
export const transformMetricsForDisplay = (metrics: Partial<WellbeingMetrics>) => {
  return Object.entries(METRIC_DEFINITIONS).map(([key, def]) => ({
    key: key as keyof WellbeingMetrics,
    label: def.label,
    value: metrics[key as keyof WellbeingMetrics] ?? 50,
    description: getMetricDescription(key as keyof WellbeingMetrics, metrics[key as keyof WellbeingMetrics] ?? 50),
    isPositive: def.higherIsGood
  }));
};

// Memoized score calculation to avoid recalculation
let lastMetrics: string | null = null;
let lastScore: number | null = null;

export const getMemoizedWellbeingScore = (metrics: Partial<WellbeingMetrics>): number => {
  const metricsKey = JSON.stringify(metrics);
  
  if (lastMetrics === metricsKey && lastScore !== null) {
    return lastScore;
  }
  
  const score = computeWellbeingScore(metrics);
  lastMetrics = metricsKey;
  lastScore = score;
  
  return score;
};