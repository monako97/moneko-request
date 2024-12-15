// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export type Method =
  | 'GET'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'PURGE'
  | 'LINK'
  | 'UNLINK';

export type RequestOption = {
  responseType?: XMLHttpRequestResponseType;
  method?: Method;
  onProgress?(progress: ProgressEvent<XMLHttpRequestEventTarget>): void;
  onAbort?(e: ProgressEvent<XMLHttpRequestEventTarget>): void;
  withCredentials?: boolean;
  data?: { [key: string]: Any } | BodyInit | false | Array<Any>;
  headers?: Record<string, string>;
  showLoading?: boolean;
  abortId?: string;
};

interface Response {
  __xhr__?: XMLHttpRequest;
  __headers__?: Record<string, string>;
  [key: string]: unknown;
}
export interface ResponseBlob extends ResponseBody, Blob {
  filename: string;
}

export interface ResponseBody<T = Any> extends Response {
  status?: number;
  success?: boolean;
  message?: string;
  result?: T;
}
export const ContentDispositionRegExp: RegExp = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
export const HttpRegExp: RegExp = /^(http(s|):\/\/)|^(\/\/)/;
