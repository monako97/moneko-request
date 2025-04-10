import {
  ContentDispositionRegExp,
  type GenericResponse,
  HttpRegExp,
  parseUrl,
  type RequestOption,
} from './basic.js';
export * from './basic.js';

export type InterceptorRequestType = RequestOption & {
  url: string;
};

export type InterceptorType = {
  /** 请求拦截器 */
  request?(option: InterceptorRequestType): RequestOption | void;
  /** 响应拦截器 */
  response?(response: XMLHttpRequest['response'], xhr: XMLHttpRequest): void;
  /** HTTP状态码错误 */
  httpError?(xhr: XMLHttpRequest): void;
};

export type RequestExtendType = {
  /**
   * 自定义请求头
   */
  headers?: Record<string, unknown>;
  /**
   * 是否在请求中携带跨域凭据（如 Cookies）
   * @default false
   */
  withCredentials?: boolean;
  /** 拦截器配置 */
  interceptor?: InterceptorType;
  /**
   * 请求的 URL 前缀
   * 用于在基础 URL 之外追加额外的路径前缀
   */
  prefix?: string;
};

const getXhr: () => XMLHttpRequest = (function () {
  let xhrConstructor;

  if (window.ActiveXObject) {
    try {
      xhrConstructor = function () {
        return new window.ActiveXObject('Msxml2.XMLHTTP');
      };
    } catch {
      xhrConstructor = function () {
        return new window.ActiveXObject('Microsoft.XMLHTTP');
      };
    }
  } else if (window.XMLHttpRequest) {
    xhrConstructor = function () {
      return new XMLHttpRequest();
    };
  }
  return xhrConstructor as () => XMLHttpRequest;
})();
const allXhr: Record<string, XMLHttpRequest | null> = {};
const globalExtendOptions: RequestExtendType = {};

function responseHeadersToJson(headerString: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const hl = headerString.split('\r\n');

  for (let i = 0, len = hl.length; i < len; i++) {
    const h = hl[i].split(': ');

    if (Array.isArray(h) && h.length > 1) headers[h[0]] = h[1];
  }
  return headers;
}

function extraResp(
  resp: XMLHttpRequest['response'],
  xhr: XMLHttpRequest,
): XMLHttpRequest['response'] {
  const protoWithExtras = Object.create(Object.getPrototypeOf(resp));
  const headers = responseHeadersToJson(xhr.getAllResponseHeaders());
  const contentDisposition = headers['content-disposition'];

  if (xhr.responseType === 'blob' && contentDisposition) {
    const matches = ContentDispositionRegExp.exec(contentDisposition);

    if (matches && matches[1]) {
      resp.filename = decodeURIComponent(matches[1]).replace(/(^UTF-8|)['"]/g, '');
    }
  }
  Object.defineProperty(protoWithExtras, '__xhr__', {
    value: xhr,
    writable: false,
    enumerable: false,
    configurable: true,
  });
  Object.defineProperty(protoWithExtras, '__headers__', {
    value: headers,
    writable: false,
    enumerable: false,
    configurable: true,
  });
  // 将 `resp` 的原型指向带有额外属性的 `protoWithExtras`
  Object.setPrototypeOf(resp, protoWithExtras);
  return resp;
}
function isHttpSuccess(xhr: XMLHttpRequest): boolean {
  // 0 状态可能是跨域或网络错误
  if (xhr.status === 0) {
    return false;
  }
  // 标准成功状态码
  if (xhr.status >= 200 && xhr.status < 300) {
    return true;
  }
  // 特殊成功状态码
  switch (xhr.status) {
    case 304: // Not Modified (缓存)
      return true;
    case 1223: // IE特殊情况：将 204 转换为 1223
      return true;
    default:
      return false;
  }
}
function onDone<T>(xhr: XMLHttpRequest, opt: RequestOption, reslove: (resp: T) => void): void {
  if (xhr.readyState === xhr.DONE) {
    const interceptors = globalExtendOptions.interceptor;
    // 判断响应是否成功
    const isSuccess = isHttpSuccess(xhr);

    if (interceptors && interceptors.response) {
      interceptors.response(xhr.response, xhr);
    }
    if (!isSuccess && interceptors && interceptors.httpError) {
      interceptors.httpError(xhr);
    }
    if (opt.abortId && Object.prototype.hasOwnProperty.call(allXhr, opt.abortId)) {
      allXhr[opt.abortId] = null;
      delete allXhr[opt.abortId];
    }
    if (xhr.response) {
      return reslove(extraResp(xhr.response, xhr));
    }
    return reslove(
      extraResp(
        {
          status: xhr.status,
          message: xhr.statusText,
          success: false,
        } as unknown as T,
        xhr,
      ),
    );
  }
}

export function request<T = GenericResponse>(url: string, opt: RequestOption = {}): Promise<T> {
  return new Promise((reslove) => {
    const interceptors = globalExtendOptions.interceptor;
    const method = opt.method ? opt.method.toLocaleUpperCase() : ('GET' as const);
    const isFormData: boolean = opt.data instanceof FormData;
    let prefix = HttpRegExp.test(url) ? '' : globalExtendOptions.prefix || '';
    let uri = url;

    opt.headers = Object.assign(
      {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Requested-With': 'XMLHttpRequest',
      },
      globalExtendOptions.headers || {},
      opt.headers,
    );
    const xhr = getXhr();

    xhr.responseType = opt.responseType || 'json';
    if (xhr.readyState === xhr.UNSENT && interceptors && interceptors.request) {
      const nopt = interceptors.request(Object.assign({ url }, opt));

      if (nopt) {
        Object.assign(opt, nopt);
      }
    }
    if (opt.params && Object.keys(opt.params).length) {
      const params = new URLSearchParams(opt.params as Record<string, string>);

      uri = `${url}?${params.toString()}`;
    }
    if (isFormData) {
      delete opt.headers['Content-Type'];
    } else if (opt.data !== null && !['undefined', 'string'].includes(typeof opt.data)) {
      opt.data = JSON.stringify(opt.data);
    }
    xhr.addEventListener('readystatechange', function () {
      onDone(xhr, opt, reslove);
    });
    if (opt.onProgress) {
      xhr.addEventListener('progress', opt.onProgress);
    }
    if (opt.onAbort) {
      xhr.addEventListener('abort', opt.onAbort);
    }
    if (opt.prefix) {
      prefix = opt.prefix;
    }
    xhr.open(method || 'GET', parseUrl([prefix, uri].filter(Boolean).join('/')));
    if (opt.withCredentials !== void 0) {
      xhr.withCredentials = opt.withCredentials;
    } else if (globalExtendOptions.withCredentials !== void 0) {
      xhr.withCredentials = globalExtendOptions.withCredentials;
    }
    for (const key in opt.headers) {
      if (Object.hasOwnProperty.call(opt.headers, key)) {
        xhr.setRequestHeader(key, opt.headers[key]);
      }
    }
    if (opt.abortId) {
      allXhr[opt.abortId] = xhr;
    }
    xhr.send(opt.data as XMLHttpRequestBodyInit | Document);
  });
}

export function cancelRequest(abortId: string): void {
  if (Object.prototype.hasOwnProperty.call(allXhr, abortId) && allXhr[abortId]) {
    allXhr[abortId].abort();
    allXhr[abortId] = null;
    delete allXhr[abortId];
  }
}

export function extend(opt: RequestExtendType): typeof request {
  Object.assign(globalExtendOptions, opt);
  return request;
}
