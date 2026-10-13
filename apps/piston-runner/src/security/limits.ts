export const TIMEOUT_MS = Number(process.env.PISTON_TIMEOUT_MS) || 10000; 
export const RUN_TIMEOUT_MS = Number(process.env.PISTON_RUN_TIMEOUT_MS) || 3000; 
export const MAX_MEMORY_BYTES = (Number(process.env.PISTON_MAX_MEMORY_MB) || 256) * 1024 * 1024;