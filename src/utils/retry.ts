export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: { maxAttempts?: number; initialDelayMs?: number; label?: string }
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const initialDelay = options?.initialDelayMs ?? 1000;
  const label = options?.label ?? 'operation';

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        const delay = initialDelay * Math.pow(2, attempt - 1);
        console.warn(`[retry] ${label} attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

export async function withSupabaseRetry<T>(
  fn: () => PromiseLike<{ data: T; error: unknown }>,
  label?: string
): Promise<{ data: T; error: null }> {
  return withRetry(
    async () => {
      const result = await fn();
      if (result.error) {
        throw result.error;
      }
      return { data: result.data, error: null as null };
    },
    { label: label ?? 'supabase-query' }
  );
}
