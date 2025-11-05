/**
 * Subscription Tiers Configuration
 *
 * Single source of truth for all subscription tier names, limits, and pricing
 */

export type SubscriptionTier = 'gratis' | 'basico' | 'profesional';

export interface TierConfig {
  id: SubscriptionTier;
  name: string;
  displayName: string;
  maxCases: number;
  price: number; // Monthly price in MXN
  description: string;
  features: string[];
  isPopular?: boolean;
}

/**
 * All available subscription tiers
 * Add new tiers here as needed
 */
export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, TierConfig> = {
  gratis: {
    id: 'gratis',
    name: 'gratis',
    displayName: 'Gratis',
    maxCases: 5,
    price: 0,
    description: 'Perfecto para comenzar',
    features: [
      '5 casos monitoreados',
      'Alertas por email',
      'Acceso al dashboard',
      'Historial de 90 días',
    ],
  },
  basico: {
    id: 'basico',
    name: 'basico',
    displayName: 'Básico',
    maxCases: 100,
    price: 299,
    description: 'Para profesionales independientes',
    isPopular: true,
    features: [
      '100 casos monitoreados',
      'Alertas por email',
      'Alertas por WhatsApp',
      'Historial de 90 días',
      'Soporte por email',
    ],
  },
  profesional: {
    id: 'profesional',
    name: 'profesional',
    displayName: 'Profesional',
    maxCases: 500,
    price: 999,
    description: 'Para despachos y equipos',
    features: [
      '500 casos monitoreados',
      'Alertas por email',
      'Alertas por WhatsApp',
      'Historial ilimitado',
      'Soporte prioritario',
      'Exportación de datos',
    ],
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
