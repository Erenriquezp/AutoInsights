// Base URL of the AutoInsights API. Set VITE_API_URL at build time:
// "http://localhost:8000/api" for local development, "/api" behind CloudFront.
export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';
