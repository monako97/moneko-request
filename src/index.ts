import {
  ContentDispositionRegExp,
  HttpRegExp,
  type RequestOption,
  type ResponseBody,
} from './basic.js';
export * from './basic.js';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export interface ResponsePageData<T = Any> extends ResponseBody<T> {
  /** 当前页码 */
  current: number;
  /** 分页大小 */
  pageSize: number;
  /** 总共页数 */
  totalPage: number;
  /** 总共条数 */
  total: number;
  /** 当前页数据 */
  data: T[];
}
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
  /** 公用 Header */
  headers?: Record<string, unknown>;
  withCredentials?: boolean;
  /** 拦截器配置 */
  interceptor?: InterceptorType;
  /** 请求前缀 */
  prefixUrl?: string;
};

const getXhr = (function () {
  let xhrConstructor;

  if (window.ActiveXObject) {
    try {
      xhrConstructor = function () {
        return new window.ActiveXObject('Msxml2.XMLHTTP');
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
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

function responseHeadersToJson(headerString: string) {
  const headers: Record<string, string> = {};
  const hl = headerString.split('\r\n');

  for (let i = 0, len = hl.length; i < len; i++) {
    const h = hl[i].split(': ');

    if (Array.isArray(h) && h.length > 1) headers[h[0]] = h[1];
  }
  return headers;
}

function extraResp(resp: XMLHttpRequest['response'], xhr: XMLHttpRequest) {
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
function onDone<T>(xhr: XMLHttpRequest, opt: RequestOption, reslove: (resp: T) => void) {
  if (xhr.readyState === xhr.DONE) {
    const interceptors = globalExtendOptions.interceptor;
    // 判断响应是否成功
    const isSuccess = isHttpSuccess(xhr);

    if (interceptors?.response) {
      interceptors.response(xhr.response, xhr);
    }
    if (!isSuccess && interceptors?.httpError) {
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
const stringifyData = ['POST', 'PUT', 'DELETE', 'PATCH'];

export function request<T = ResponseBody>(url: string, opt: RequestOption = {}): Promise<T> {
  return new Promise((reslove) => {
    const interceptors = globalExtendOptions.interceptor;
    const method = opt.method?.toLocaleUpperCase() || 'GET';
    const isFormData: boolean = opt.data instanceof FormData;
    const prefix = HttpRegExp.test(url) ? '' : globalExtendOptions.prefixUrl || '';
    let uri = url;

    opt.headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Requested-With': 'XMLHttpRequest',
      ...((globalExtendOptions.headers as Record<string, string>) || {}),
      ...opt.headers,
    };
    const xhr = getXhr();

    xhr.responseType = opt.responseType || 'json';
    if (xhr.readyState === xhr.UNSENT && interceptors && interceptors.request) {
      const nopt = interceptors.request({
        url,
        ...opt,
      });

      if (nopt) {
        Object.assign(opt, nopt);
      }
    }
    if (isFormData) {
      delete opt.headers['Content-Type'];
    } else if (stringifyData.includes(method)) {
      if (typeof opt.data !== 'string') {
        opt.data = JSON.stringify(opt.data);
      }
    } else if (method === 'GET' && opt.data && Object.keys(opt.data).length) {
      const params = new URLSearchParams(opt.data as Record<string, string>);

      uri = `${url}?${params.toString()}`;
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
    xhr.open(method || 'GET', prefix + uri);
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
  if (Object.prototype.hasOwnProperty.call(allXhr, abortId)) {
    allXhr[abortId]?.abort();
    allXhr[abortId] = null;
    delete allXhr[abortId];
  }
}

export function extend(opt: RequestExtendType): typeof request {
  Object.assign(globalExtendOptions, opt);
  return request;
}
