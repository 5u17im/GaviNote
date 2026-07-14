const isDev = process.env.NODE_ENV !== 'production';

export function logError(message: string, error?: unknown) {
  if (isDev) {
    console.error(message, error);
  }
}

export function logInfo(message: string) {
  if (isDev) {
    console.info(message);
  }
}
