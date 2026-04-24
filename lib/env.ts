const REQUIRED_PUBLIC_ENV_VARS = [
  "NEXT_PUBLIC_STELLAR_NETWORK",
  "NEXT_PUBLIC_HORIZON_URL",
  "NEXT_PUBLIC_SOROBAN_RPC_URL",
] as const;

type RequiredPublicEnvVar = (typeof REQUIRED_PUBLIC_ENV_VARS)[number];

type EnvSource = Partial<Record<RequiredPublicEnvVar, string | undefined>>;

type EnvLogger = Pick<typeof console, "warn">;

export function getMissingEnvVars(
  env: EnvSource = process.env
): RequiredPublicEnvVar[] {
  return REQUIRED_PUBLIC_ENV_VARS.filter((key) => {
    const value = env[key];
    return typeof value !== "string" || value.trim().length === 0;
  });
}

export function validateEnv(
  env: EnvSource = process.env,
  nodeEnv = process.env.NODE_ENV,
  logger: EnvLogger = console
): void {
  const missing = getMissingEnvVars(env);

  if (missing.length === 0) {
    return;
  }

  const message = `Missing required environment variables: ${missing.join(", ")}`;

  if (nodeEnv === "production") {
    logger.warn(message);
    return;
  }

  throw new Error(message);
}

export const env = {
  NEXT_PUBLIC_STELLAR_NETWORK: process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "",
  NEXT_PUBLIC_HORIZON_URL: process.env.NEXT_PUBLIC_HORIZON_URL ?? "",
  NEXT_PUBLIC_SOROBAN_RPC_URL: process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? "",
} as const;

validateEnv();
