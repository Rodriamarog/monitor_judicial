/**
 * Subscription Tiers Configuration
 *
 * Single source of truth for all subscription tier names, limits, and pricing
 */

export type SubscriptionTier = 'gratis' | 'esencial' | 'pro' | 'elite' | 'max';

export type TierFeatureKey =
  | 'hasTemplates'
  | 'hasCalendar'
  | 'hasTesis'
  | 'hasKanban'
  | 'hasTribunalAlerts'
  | 'hasAIDocumentSummary'
  | 'hasDocumentDownload'
  | 'hasAIAssistant'
  | 'hasWhatsApp';

export interface TierFeatures {
  hasTemplates: boolean;
  hasCalendar: boolean;
  hasTesis: boolean;
  hasKanban: boolean;
  hasTribunalAlerts: boolean;
  hasAIDocumentSummary: boolean;
  hasDocumentDownload: boolean;
  hasAIAssistant: boolean;
  hasWhatsApp: boolean;
}

export interface TierConfig {
  id: SubscriptionTier;
  name: string;
  displayName: string;
  maxCases: number;
  maxCollaborators: number; // Number of additional collaborators allowed
  monthlyPrice: number; // Monthly price in MXN (499 = $499 MXN)
  yearlyPrice: number; // Yearly price in MXN (4990 = $4,990 MXN)
  description: string;
  features: TierFeatures; // Boolean flags for feature gates
  displayFeatures: string[]; // Human-readable feature list for pricing UI
  highlightedDisplayFeatures?: string[]; // Features to visually highlight in pricing UI
  isPopular?: boolean;
}

/**
 * All available subscription tiers
 */
export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, TierConfig> = {
  gratis: {
    id: 'gratis',
    name: 'gratis',
    displayName: 'Gratis',
    maxCases: 5,
    maxCollaborators: 0,
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'Perfecto para comenzar',
    features: {
      hasTemplates: false,
      hasCalendar: false,
      hasTesis: false,
      hasKanban: false,
      hasTribunalAlerts: false,
      hasAIDocumentSummary: false,
      hasDocumentDownload: false,
      hasAIAssistant: false,
      hasWhatsApp: false,
    },
    displayFeatures: [
      '5 casos monitoreados',
      'Alertas por boletín (expediente)',
      'Alertas por boletín (nombre)',
      'Acceso al dashboard',
    ],
  },
  esencial: {
    id: 'esencial',
    name: 'esencial',
    displayName: 'Esencial',
    maxCases: 100,
    maxCollaborators: 0,
    monthlyPrice: 499,
    yearlyPrice: 4990,
    description: 'Para abogados independientes',
    features: {
      hasTemplates: false,
      hasCalendar: false,
      hasTesis: false,
      hasKanban: false,
      hasTribunalAlerts: false,
      hasAIDocumentSummary: false,
      hasDocumentDownload: false,
      hasAIAssistant: false,
      hasWhatsApp: false,
    },
    displayFeatures: [
      '100 casos monitoreados',
      'Alertas por boletín (expediente)',
      'Alertas por boletín (nombre)',
      'Soporte por email',
    ],
  },
  pro: {
    id: 'pro',
    name: 'pro',
    displayName: 'Pro',
    maxCases: 250,
    maxCollaborators: 2,
    monthlyPrice: 999,
    yearlyPrice: 9990,
    description: 'Para bufetes pequeños',
    features: {
      hasTemplates: true,
      hasCalendar: true,
      hasTesis: true,
      hasKanban: true,
      hasTribunalAlerts: false,
      hasAIDocumentSummary: false,
      hasDocumentDownload: false,
      hasAIAssistant: false,
      hasWhatsApp: false,
    },
    displayFeatures: [
      '250 casos monitoreados',
      '2 colaboradores adicionales',
      'Machotes / Plantillas',
      'Calendario',
      'Buscador de Tesis',
      'Proyectos / Kanban',
      'Soporte prioritario',
    ],
  },
  elite: {
    id: 'elite',
    name: 'elite',
    displayName: 'Elite',
    maxCases: 500,
    maxCollaborators: 4,
    monthlyPrice: 1999,
    yearlyPrice: 19990,
    description: 'Para despachos medianos',
    isPopular: true,
    features: {
      hasTemplates: true,
      hasCalendar: true,
      hasTesis: true,
      hasKanban: true,
      hasTribunalAlerts: true,
      hasAIDocumentSummary: true,
      hasDocumentDownload: true,
      hasAIAssistant: false,
      hasWhatsApp: false,
    },
    displayFeatures: [
      '500 casos monitoreados',
      '4 colaboradores adicionales',
      'Todo lo del plan Pro',
      'Alertas Tribunal Electrónico',
      'Resumen IA del documento',
      'Descarga de documentos',
      'Soporte prioritario 24/7',
    ],
    highlightedDisplayFeatures: ['Alertas Tribunal Electrónico'],
  },
  max: {
    id: 'max',
    name: 'max',
    displayName: 'Max',
    maxCases: 1000,
    maxCollaborators: 6,
    monthlyPrice: 2999,
    yearlyPrice: 29990,
    description: 'Para despachos grandes',
    features: {
      hasTemplates: true,
      hasCalendar: true,
      hasTesis: true,
      hasKanban: true,
      hasTribunalAlerts: true,
      hasAIDocumentSummary: true,
      hasDocumentDownload: true,
      hasAIAssistant: true,
      hasWhatsApp: true,
    },
    displayFeatures: [
      '1000 casos monitoreados',
      '6 colaboradores adicionales',
      'Todo lo del plan Elite',
      'Asistente IA (RAG)',
      'Asistente WhatsApp: agenda citas y avisa a tus clientes automáticamente',
      'Gerente de cuenta dedicado',
    ],
    highlightedDisplayFeatures: ['Asistente WhatsApp: agenda citas y avisa a tus clientes automáticamente'],
  },
};

/**
 * Get tier configuration by ID
 */
export function getTierConfig(tier: string | null | undefined): TierConfig {
  if (!tier || !(tier in SUBSCRIPTION_TIERS)) {
    return SUBSCRIPTION_TIERS.gratis;
  }
  return SUBSCRIPTION_TIERS[tier as SubscriptionTier];
}

/**
 * Check if a tier has access to a specific feature
 */
export function hasFeature(tier: string | null | undefined, feature: TierFeatureKey): boolean {
  return getTierConfig(tier).features[feature];
}

/**
 * Get maximum cases allowed for a tier
 */
export function getMaxCases(tier: string | null | undefined): number {
  return getTierConfig(tier).maxCases;
}

/**
 * Get all tiers as an array (for pricing pages, etc.)
 */
export function getAllTiers(): TierConfig[] {
  return Object.values(SUBSCRIPTION_TIERS);
}

/**
 * Check if user has reached their case limit
 */
export function hasReachedLimit(currentCount: number, tier: string | null | undefined): boolean {
  const maxCases = getMaxCases(tier);
  return currentCount >= maxCases;
}

/**
 * Get available cases remaining
 */
export function getRemainingCases(currentCount: number, tier: string | null | undefined): number {
  const maxCases = getMaxCases(tier);
  return Math.max(0, maxCases - currentCount);
}

/**
 * Format price in MXN currency string
 * Prices are stored as whole numbers (499 = $499 MXN)
 */
export function formatPrice(price: number): string {
  if (price === 0) return 'Gratis';
  return `$${price.toLocaleString()}`;
}

/**
 * Calculate monthly equivalent price for yearly plans
 */
export function getMonthlyEquivalent(yearlyPrice: number): string {
  const monthlyEquivalent = yearlyPrice / 12;
  return `$${monthlyEquivalent.toFixed(0)}`;
}

/**
 * Get maximum collaborators allowed for a tier
 */
export function getMaxCollaborators(tier: string | null | undefined): number {
  return getTierConfig(tier).maxCollaborators;
}
