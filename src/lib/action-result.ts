import { safeErrorMessage } from "@/lib/validation/transaction";

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string };

export function ok<T>(data: T, message?: string): ActionResult<T> {
  return { ok: true, data, message };
}

export function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

export async function withAction<T>(
  work: () => Promise<T>,
  fallback = "Something went wrong. Nothing was saved.",
): Promise<ActionResult<T>> {
  try {
    const data = await work();
    return ok(data);
  } catch (error) {
    return fail(safeErrorMessage(error, fallback));
  }
}

export function assertOk<T>(result: ActionResult<T>): asserts result is { ok: true; data: T; message?: string } {
  if (!result.ok) {
    throw new Error(result.error);
  }
}
