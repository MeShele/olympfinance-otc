import React, { lazy, Suspense } from 'react';
import type { SectionConfig } from '@/hooks/useSiteContent';

// Lazy-load section variants
const HeroDefault = lazy(() => import('@/components/Hero'));
const HeroParticles = lazy(() => import('@/components/sections/heroes/HeroParticles'));
const HeroMinimal = lazy(() => import('@/components/sections/heroes/HeroMinimal'));

const StatsDefault = lazy(() => import('@/components/Stats'));
const StatsCountUp = lazy(() => import('@/components/sections/stats/StatsCountUp'));

const FeaturesDefault = lazy(() => import('@/components/Features'));
const FeaturesSpotlight = lazy(() => import('@/components/sections/features/FeaturesSpotlight'));
const FeaturesSolid = lazy(() => import('@/components/sections/features/FeaturesSolid'));

const CurrenciesDefault = lazy(() => import('@/components/Currencies'));

const CTADefault = lazy(() => import('@/components/sections/CTASection'));
const CTAMinimal = lazy(() => import('@/components/sections/cta/CTAMinimal'));

const sectionComponents: Record<string, Record<string, React.LazyExoticComponent<any>>> = {
  hero: {
    default: HeroDefault,
    particles: HeroParticles,
    minimal: HeroMinimal,
  },
  stats: {
    default: StatsDefault,
    'count-up': StatsCountUp,
  },
  features: {
    default: FeaturesDefault,
    spotlight: FeaturesSpotlight,
    solid: FeaturesSolid,
  },
  currencies: {
    default: CurrenciesDefault,
  },
  cta: {
    default: CTADefault,
    minimal: CTAMinimal,
  },
};

interface Props {
  sections: SectionConfig[];
}

export const SectionRenderer: React.FC<Props> = ({ sections }) => {
  return (
    <>
      {sections
        .filter(s => s.is_enabled)
        .sort((a, b) => a.display_order - b.display_order)
        .map(section => {
          const variants = sectionComponents[section.section];
          if (!variants) return null;
          const Component = variants[section.variant] || variants['default'];
          if (!Component) return null;

          return (
            <Suspense key={section.section} fallback={<div className="min-h-[200px]" />}>
              <Component />
            </Suspense>
          );
        })}
    </>
  );
};
