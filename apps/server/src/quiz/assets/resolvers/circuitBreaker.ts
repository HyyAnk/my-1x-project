export type ProviderTier =
  | "primary"
  | "fallback-level-1"
  | "fallback-level-2"
  | "fallback-level-3"
  | "fallback-gpti2-bridge";

export interface CircuitBreakerOptions {
  failureThreshold?: number;
}

export interface TierStatus {
  tripped: boolean;
  failureCount: number;
  failedAssets: string[];
}

export const DEFAULT_CIRCUIT_BREAKER_THRESHOLD = 5;

export const PROVIDER_TIERS: readonly ProviderTier[] = [
  "primary",
  "fallback-level-1",
  "fallback-level-2",
  "fallback-level-3",
  "fallback-gpti2-bridge",
] as const;

interface InternalTierState {
  tripped: boolean;
  failedAssets: Set<string>;
}

/**
 * Concurrency-safe circuit breaker tracking distinct asset failures per provider tier.
 * Prevents cascading retries to failing providers once a tier reaches the failure threshold.
 */
export class ProviderCircuitBreaker {
  private readonly failureThreshold: number;
  private readonly tierStates: Map<ProviderTier, InternalTierState>;

  constructor(options: CircuitBreakerOptions = {}) {
    const threshold = options.failureThreshold;
    this.failureThreshold =
      typeof threshold === "number" && Number.isFinite(threshold) && threshold > 0
        ? Math.floor(threshold)
        : DEFAULT_CIRCUIT_BREAKER_THRESHOLD;

    this.tierStates = new Map<ProviderTier, InternalTierState>();
    for (const tier of PROVIDER_TIERS) {
      this.tierStates.set(tier, {
        tripped: false,
        failedAssets: new Set<string>(),
      });
    }
  }

  /**
   * Returns whether the given tier has tripped the circuit breaker and should be bypassed.
   */
  isBypassed(tier: ProviderTier): boolean {
    const state = this.getTierState(tier);
    return state.tripped;
  }

  /**
   * Resets consecutive failures for the specified tier, clearing failed asset tracking
   * and resetting tripped state to false.
   */
  recordSuccess(tier: ProviderTier): void {
    const state = this.getTierState(tier);
    state.failedAssets.clear();
    state.tripped = false;
  }

  /**
   * Records a distinct asset failure for the specified tier.
   * If the number of distinct failed asset IDs reaches or exceeds failureThreshold,
   * trips the breaker for that tier.
   */
  recordFailure(
    tier: ProviderTier,
    assetId: string,
  ): { tripped: boolean; distinctFailures: number } {
    const state = this.getTierState(tier);
    if (assetId !== undefined && assetId !== null) {
      state.failedAssets.add(String(assetId));
    }
    if (state.failedAssets.size >= this.failureThreshold) {
      state.tripped = true;
    }
    return {
      tripped: state.tripped,
      distinctFailures: state.failedAssets.size,
    };
  }

  /**
   * Returns a snapshot of diagnostic status across all provider tiers.
   */
  getDiagnostics(): Record<ProviderTier, TierStatus> {
    const diagnostics = {} as Record<ProviderTier, TierStatus>;
    for (const tier of PROVIDER_TIERS) {
      const state = this.getTierState(tier);
      diagnostics[tier] = {
        tripped: state.tripped,
        failureCount: state.failedAssets.size,
        failedAssets: Array.from(state.failedAssets),
      };
    }
    return diagnostics;
  }

  /**
   * Resets failure tracking for a specific tier or across all tiers if tier is omitted.
   */
  reset(tier?: ProviderTier): void {
    if (tier) {
      const state = this.getTierState(tier);
      state.failedAssets.clear();
      state.tripped = false;
      return;
    }
    for (const state of this.tierStates.values()) {
      state.failedAssets.clear();
      state.tripped = false;
    }
  }

  private getTierState(tier: ProviderTier): InternalTierState {
    let state = this.tierStates.get(tier);
    if (!state) {
      state = {
        tripped: false,
        failedAssets: new Set<string>(),
      };
      this.tierStates.set(tier, state);
    }
    return state;
  }
}

/**
 * Factory helper for creating a ProviderCircuitBreaker instance.
 */
export function createProviderCircuitBreaker(
  options?: CircuitBreakerOptions,
): ProviderCircuitBreaker {
  return new ProviderCircuitBreaker(options);
}
