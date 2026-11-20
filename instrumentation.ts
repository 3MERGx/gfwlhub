/**
 * Global server-side request error logging.
 * Captures RSC and Route Handler failures that bypass local try/catch.
 * Never exposes details to the client — only logs via safeLog.
 */
export async function onRequestError(
  error: unknown,
  request: {
    path: string;
    method: string;
    headers: { [key: string]: string | string[] | undefined };
  },
  context: {
    routerKind: "Pages Router" | "App Router";
    routePath: string;
    routeType: "render" | "route" | "action" | "middleware";
  }
) {
  const { safeLog } = await import("@/lib/security");
  safeLog.error("Unhandled request error:", {
    path: request.path,
    method: request.method,
    routerKind: context.routerKind,
    routePath: context.routePath,
    routeType: context.routeType,
    error,
  });
}

export async function register() {
  // Reserved for future OpenTelemetry / monitoring hooks.
}
