/**
 * Order Document PDF Generator
 * 
 * This module has been refactored into smaller, focused files:
 * - src/utils/pdf/constants.ts - Operator details and layout constants
 * - src/utils/pdf/types.ts - TypeScript types
 * - src/utils/pdf/helpers.ts - Utility functions
 * - src/utils/pdf/sections/header.ts - Document header
 * - src/utils/pdf/sections/title.ts - Title and preamble
 * - src/utils/pdf/sections/tables.ts - Order tables (buy/sell/exchange)
 * - src/utils/pdf/sections/details.ts - Detail sections
 * - src/utils/pdf/sections/footer.ts - Signatures and footer
 * - src/utils/pdf/generator.ts - Main generation function
 */

// Re-export main functions for backward compatibility
export { generateOrderPDF } from './pdf/generator';
export { generateOrderNumber } from './pdf/helpers';
export type { OrderData, OrderType } from './pdf/types';
