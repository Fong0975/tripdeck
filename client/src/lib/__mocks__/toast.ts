import { vi } from 'vitest';

/** Manual mock for `@/lib/toast`, used via `vi.mock('@/lib/toast')`. */
export const showToast = vi.fn();
