import type { IBackendConfig } from "../types";

export const getBackendConfig = (env: "staging" | "integration" | "prod" | "local"): IBackendConfig => {

  const config = {
    apiKey: process.env[`${env.toUpperCase()}_API_KEY`] as string,
    apiUsername: process.env[`${env.toUpperCase()}_API_USERNAME`] as string,
    apiPassword: process.env[`${env.toUpperCase()}_API_PASSWORD`] as string,
    baseUrl: process.env[`${env.toUpperCase()}_API_URL`] as string,
  };
  if (!config.apiKey || !config.apiUsername || !config.apiPassword || !config.baseUrl) {
    throw new Error(
      `Missing ${env.toUpperCase()}_API_KEY, ${env.toUpperCase()}_API_USERNAME, ${env.toUpperCase()}_API_PASSWORD, ${env.toUpperCase()}_API_URL`
    );
  }
  return config;
};
