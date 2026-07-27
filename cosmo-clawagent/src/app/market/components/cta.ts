// Shared button classes for the marketplace flow. One big, unmissable CTA
// per state is the core of the buyer UX — every action button in the flow
// uses CTA_BIG (or CTA_DANGER for recovery actions) so "what do I do next"
// is never a hunt.
//
// The class strings now come from the design system (src/components/cosmo/
// Cta.tsx). The exported names are unchanged on purpose: every call site in
// the flow keeps working and inherits the new palette without an edit.

import { ctaClasses } from '@/components/cosmo/Cta';

export const CTA_BIG = ctaClasses('primary', 'lg', true);

export const CTA_DANGER = ctaClasses('danger', 'lg', true);

export const BTN_GHOST = ctaClasses('secondary', 'sm');
