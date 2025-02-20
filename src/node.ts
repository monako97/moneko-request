import http, { type IncomingMessage, type OutgoingHttpHeaders } from 'http';
import https from 'https';
import { URL } from 'url';

import { HttpRegExp, type RequestOption as BasicOption, type ResponseBody } from './basic.js';

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
  prefixUrl?: string;
};

const globalExtendOptions: HttpRequestExtendType = {};

interface RequestOption extends Omit<BasicOption, 'headers' | 'onProgress'> {
  headers?: OutgoingHttpHeaders;
  onProgress?(progress: number, total: number): void;
}
export function request<T = ResponseBody>(url: string, opt: RequestOption = {}): Promise<T> {
  const options = { ...globalExtendOptions, ...opt };
  const { method = 'GET', headers, data, abortId, responseType = 'json' } = options;

  // 拦截器
  if (globalExtendOptions.interceptor?.request) {
    const modifiedOptions = globalExtendOptions.interceptor.request({ ...options, url });

    if (modifiedOptions) {
      Object.assign(options, modifiedOptions);
    }
  }
  // 添加请求前缀
  let prefix = HttpRegExp.test(url) ? '' : globalExtendOptions.prefixUrl || '';

  if (options.prefix) {
    prefix = options.prefix;
  }
  const urlObj = new URL(`${prefix}${url}`.replace(/\/+/g, '/'));
  const isHttps = urlObj.protocol === 'https:';
  const lib = isHttps ? https : http;

  return new Promise<T>((resolve, reject) => {
    const req = lib.request(
      `${prefix}${url}`,
      {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method,
        headers,
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
          options.onProgress?.(progress, total);
        });
        res.on('end', () => {
          const rawData = Buffer.concat(chunks);
          let parsedData: T;

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
          if (globalExtendOptions.interceptor?.response) {
            globalExtendOptions.interceptor.response(parsedData, res);
          }
          resolve(parsedData as T);
        });
      },
    );

    req.on('error', (err) => {
      if (globalExtendOptions.interceptor?.httpError) {
        globalExtendOptions.interceptor.httpError(err);
      }
      reject(err);
    });

    if (abortId) {
      const controller = new AbortController();

      abortControllers.set(abortId, controller);
      controller.signal.addEventListener('abort', () => req.destroy());
    }

    if (data) {
      req.write(typeof data === 'object' ? JSON.stringify(data) : data);
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
