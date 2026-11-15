import { vi } from 'vitest';

/**
 * Manual mock for `@/components/ui/toast`, used via
 * `vi.mock('@/components/ui/toast')`. Named `index.tsx` to match the real
 * module's file name exactly, which is how vitest locates manual mocks.
 */
export const showToast = vi.fn();
