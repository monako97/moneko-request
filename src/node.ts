import http, { type IncomingMessage, type OutgoingHttpHeaders } from 'http';
import https from 'https';
import { URL } from 'url';

import {
  HttpRegExp,
  parseUrl,
  type RequestOption as BasicOption,
  type ResponseBody,
} from './basic.js';

const abortControllers = new Map<string, AbortController>();

export type InterceptorRequestType = RequestOption & {
  url: string;
};
export type HttpInterceptorType = {
  /** 请求拦截器 */
  request?(option: InterceptorRequestType): RequestOption | void;
  /** 响应拦截器 */
  response?(response: XMLHttpRequest['response'], xhr: IncomingMessage): void;
  /** HTTP状态错误 */
  httpError?(err: Error): void;
};

export type HttpRequestExtendType = {
  /** 公用 Header */
  headers?: OutgoingHttpHeaders;
  withCredentials?: boolean;
  /** 拦截器配置 */
  interceptor?: HttpInterceptorType;
  /** 请求前缀 */
  prefix?: string;
};

const globalExtendOptions: HttpRequestExtendType = {};

interface RequestOption extends Omit<BasicOption, 'headers' | 'onProgress'> {
  headers?: OutgoingHttpHeaders;
  onProgress?(progress: number, total: number): void;
}
export function request<T = ResponseBody>(url: string, opt: RequestOption = {}): Promise<T> {
  const options = Object.assign({}, globalExtendOptions, opt);
  const interceptors = globalExtendOptions.interceptor;

  // 拦截器
  if (interceptors && interceptors.request) {
    const modifiedOptions = interceptors.request(Object.assign({ url }, options));

    if (modifiedOptions) {
      Object.assign(options, modifiedOptions);
    }
  }
  // 添加请求前缀
  let prefix = HttpRegExp.test(url) ? '' : globalExtendOptions.prefix || '';

  if (options.prefix) {
    prefix = options.prefix;
  }
  const URI = parseUrl(`${prefix}/${url}`);
  const urlObj = new URL(URI);
  const isHttps = urlObj.protocol === 'https:';
  const lib = isHttps ? https : http;

  return new Promise<T>((resolve, reject) => {
    const req = lib.request(
      URI,
      {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: options.headers,
      },
      (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          const redirectUrl = res.headers.location;

          if (redirectUrl) {
            return request(url, opt);
          }
        }
        const chunks: Buffer[] = [];
        const total = parseInt(res.headers['content-length'] || '0'); // 文件总长度
        let progress = 0;

        res.on('data', (chunk) => {
          progress += chunk.length;
          chunks.push(chunk);
          if (options.onProgress) {
            options.onProgress(progress, total);
          }
        });
        res.on('end', () => {
          const rawData = Buffer.concat(chunks);
          let parsedData: T;
          const responseType = options.responseType === void 0 ? 'json' : options.responseType;

          try {
            switch (responseType) {
              case 'json':
                parsedData = JSON.parse(rawData.toString()) as T;
                break;
              case 'text':
                parsedData = rawData.toString() as T;
                break;
              default:
                parsedData = rawData as unknown as T;
            }
          } catch (e) {
            return reject(e);
          }
          if (interceptors && interceptors.response) {
            interceptors.response(parsedData, res);
          }
          resolve(parsedData as T);
        });
      },
    );

    req.on('error', (err) => {
      if (interceptors && interceptors.httpError) {
        interceptors.httpError(err);
      }
      reject(err);
    });

    if (options.abortId) {
      const controller = new AbortController();

      abortControllers.set(options.abortId, controller);
      controller.signal.addEventListener('abort', () => req.destroy());
    }

    if (options.data) {
      req.write(typeof options.data === 'object' ? JSON.stringify(options.data) : options.data);
    }

    req.end();
  });
}

export function cancelRequest(abortId: string): void {
  const controller = abortControllers.get(abortId);

  if (controller) {
    controller.abort();
    abortControllers.delete(abortId);
  }
}

export function extend(opt: HttpRequestExtendType): typeof request {
  Object.assign(globalExtendOptions, opt);
  return request;
}
