/**
 * Subscription Tiers Configuration
 *
 * Single source of truth for all subscription tier names, limits, and pricing
 */

export type SubscriptionTier = 'gratis' | 'pro50' | 'pro100' | 'pro250' | 'pro500' | 'pro1000';

export interface TierConfig {
  id: SubscriptionTier;
  name: string;
  displayName: string;
  maxCases: number;
  maxCollaborators: number; // Number of additional collaborators allowed
  monthlyPrice: number; // Monthly price in MXN (cents: 199 = $1.99)
  yearlyPrice: number; // Yearly price in MXN (cents: 1999 = $19.99)
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
    maxCollaborators: 0,
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'Perfecto para comenzar',
    features: [
      '5 casos monitoreados',
      'Alertas por email',
      'Acceso al dashboard',
      'Historial de 90 días',
    ],
  },
  pro50: {
    id: 'pro50',
    name: 'pro50',
    displayName: 'Pro 50',
    maxCases: 50,
    maxCollaborators: 0,
    monthlyPrice: 199,
    yearlyPrice: 1999,
    description: 'Para abogados independientes',
    features: [
      '50 casos monitoreados',
      'Alertas por email',
      'Alertas por WhatsApp',
      'Historial de 90 días',
      'Soporte por email',
    ],
  },
  pro100: {
    id: 'pro100',
    name: 'pro100',
    displayName: 'Pro 100',
    maxCases: 100,
    maxCollaborators: 1,
    monthlyPrice: 399,
    yearlyPrice: 3499,
    description: 'Para profesionales independientes',
    isPopular: true,
    features: [
      '100 casos monitoreados',
      'Alertas por email',
      'Alertas por WhatsApp',
      '1 colaborador adicional',
      'Historial de 90 días',
      'Soporte por email',
    ],
  },
  pro250: {
    id: 'pro250',
    name: 'pro250',
    displayName: 'Pro 250',
    maxCases: 250,
    maxCollaborators: 1,
    monthlyPrice: 649,
    yearlyPrice: 4999,
    description: 'Para bufetes pequeños',
    features: [
      '250 casos monitoreados',
      'Alertas por email',
      'Alertas por WhatsApp',
      '1 colaborador adicional',
      'Historial de 90 días',
      'Soporte prioritario',
      'Exportación de datos',
    ],
  },
  pro500: {
    id: 'pro500',
    name: 'pro500',
    displayName: 'Pro 500',
    maxCases: 500,
    maxCollaborators: 2,
    monthlyPrice: 999,
    yearlyPrice: 8999,
    description: 'Para despachos medianos',
    features: [
      '500 casos monitoreados',
      'Alertas por email',
      'Alertas por WhatsApp',
      '2 colaboradores adicionales',
      'Historial ilimitado',
      'Soporte prioritario',
      'Exportación de datos',
      'API access',
    ],
  },
  pro1000: {
    id: 'pro1000',
    name: 'pro1000',
    displayName: 'Pro 1000',
    maxCases: 1000,
    maxCollaborators: 2,
    monthlyPrice: 1799,
    yearlyPrice: 12499,
    description: 'Para despachos grandes',
    features: [
      '1000 casos monitoreados',
      'Alertas por email',
      'Alertas por WhatsApp',
      '2 colaboradores adicionales',
      'Historial ilimitado',
      'Soporte prioritario 24/7',
      'Exportación de datos',
      'API access',
      'Gerente de cuenta dedicado',
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

/**
 * Format price in cents to MXN currency string
 * Prices are stored as whole numbers (199 = $199 MXN, not cents)
 */
export function formatPrice(price: number): string {
  if (price === 0) return 'Gratis';
  return `$${price}`;
}

/**
 * Calculate monthly equivalent price for yearly plans
 */
export function getMonthlyEquivalent(yearlyPrice: number): string {
  const monthlyEquivalent = yearlyPrice / 12;
  return `$${monthlyEquivalent.toFixed(2)}`;
}

/**
 * Get maximum collaborators allowed for a tier
 */
export function getMaxCollaborators(tier: string | null | undefined): number {
  return getTierConfig(tier).maxCollaborators;
}
