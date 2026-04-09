
export enum ProxyErrorCode {
  RATE_LIMITED = "RATE_LIMITED",
  UPSTREAM_ERROR = "UPSTREAM_ERROR",
  INVALID_PARAMS = "INVALID_PARAMS",
  NOT_FOUND = "NOT_FOUND",
  AUTH_REQUIRED = "AUTH_REQUIRED",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
}

export class ProxyError extends Error {
  constructor(public code: ProxyErrorCode, message?: string) {
    super(message || code);
  }
}
