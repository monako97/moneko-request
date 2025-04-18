import {
  ContentDispositionRegExp,
  type GenericResponse,
  getResponse,
  HttpRegExp,
  parseUrl,
  type RequestOption,
  withResponse,
} from './basic';
export * from './basic';

export type InterceptorRequestType = RequestOption & {
  url: string;
};

export type InterceptorType = {
  /** 请求拦截器 */
  request?(option: InterceptorRequestType): Promise<RequestOption | void>;
  /** 响应拦截器 */
  response?(response: XMLHttpRequest['response'], xhr: XMLHttpRequest | Response): Promise<void>;
  /** HTTP状态码错误 */
  httpError?(xhr: XMLHttpRequest | Response): Promise<void>;
};

export type RequestExtendType = {
  /**
   * 自定义请求头
   */
  headers?: Record<string, unknown>;
  /**
   * 是否在请求中携带跨域凭据（如 Cookies）
   * @default "include"
   */
  credentials?: RequestCredentials;
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
const abortControllers: Map<string, XMLHttpRequest | AbortController> = new Map();
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

function extraXhrResp(
  resp: XMLHttpRequest['response'],
  xhr: XMLHttpRequest,
): XMLHttpRequest['response'] {
  const headers = responseHeadersToJson(xhr.getAllResponseHeaders());
  const contentDisposition = headers['content-disposition'];

  if (xhr.responseType === 'blob' && contentDisposition) {
    const matches = ContentDispositionRegExp.exec(contentDisposition);

    if (matches && matches[1]) {
      resp.filename = decodeURIComponent(matches[1]).replace(/(^UTF-8|)['"]/g, '');
    }
  }
  return withResponse(resp, xhr, headers);
}
function isHttpSuccess(status: number): boolean {
  // 0 状态可能是跨域或网络错误
  if (status === 0) {
    return false;
  }
  // 标准成功状态码
  if (status >= 200 && status < 300) {
    return true;
  }
  // 特殊成功状态码
  switch (status) {
    case 304: // Not Modified (缓存)
      return true;
    case 1223: // IE特殊情况：将 204 转换为 1223
      return true;
    default:
      return false;
  }
}
async function onDone<T>(
  xhr: XMLHttpRequest,
  opt: RequestOption,
  reslove: (resp: T) => void,
): Promise<void> {
  if (xhr.readyState === xhr.DONE) {
    if (opt.abortId && abortControllers.has(opt.abortId)) {
      abortControllers.delete(opt.abortId);
    }
    const interceptors = globalExtendOptions.interceptor;
    // 判断响应是否成功
    const isSuccess = isHttpSuccess(xhr.status);

    await Promise.all([
      interceptors?.response?.(xhr.response, xhr),
      !isSuccess && interceptors?.httpError?.(xhr),
    ]);
    if (xhr.response) {
      return reslove(extraXhrResp(xhr.response, xhr));
    }
    return reslove(
      extraXhrResp(
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

export async function request<T = GenericResponse>(
  url: string,
  opt: RequestOption = {},
): Promise<T> {
  const interceptors = globalExtendOptions.interceptor;
  const method = opt.method ? opt.method.toLocaleUpperCase() : ('GET' as const);
  let prefix = HttpRegExp.test(url) ? '' : globalExtendOptions.prefix || '';
  let uri = url;

  if (opt.headers instanceof Headers) {
    opt.headers = Object.fromEntries(opt.headers);
  }

  opt.headers = Object.assign(
    {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Requested-With': 'XMLHttpRequest',
    },
    globalExtendOptions.headers || {},
    opt.headers,
  );
  if (interceptors && interceptors.request) {
    const nopt = await interceptors.request(Object.assign({ url }, opt));

    if (nopt) {
      Object.assign(opt, nopt);
    }
  }
  const compressedBody = opt.headers['Content-Encoding'] === 'gzip';

  if (opt.data instanceof FormData) {
    delete opt.headers['Content-Type'];
  } else if (opt.data !== null && !['undefined', 'string'].includes(typeof opt.data)) {
    opt.data = JSON.stringify(opt.data);
  }
  if (compressedBody) {
    opt.data = await new Response(
      new Blob([opt.data], {
        type: opt.headers['Content-Type'],
      })
        .stream()
        .pipeThrough(new CompressionStream('gzip')),
    ).blob();
  }
  const {
    prefix: _prefix,
    responseType = 'json',
    onProgress,
    onAbort,
    abortId,
    data,
    params,
    ...rest
  } = opt;

  if (params && Object.keys(params).length) {
    uri = `${url}?${new URLSearchParams(params).toString()}`;
  }
  if (_prefix) {
    prefix = _prefix;
  }
  uri = parseUrl([prefix, uri].filter(Boolean).join('/'));
  if (onProgress || !('fetch' in self)) {
    return new Promise((reslove) => {
      // 使用 XHR
      const xhr = getXhr();

      xhr.responseType = responseType;
      xhr.addEventListener('readystatechange', function () {
        onDone(xhr, opt, reslove);
      });
      if (onProgress) {
        xhr.addEventListener('progress', onProgress);
      }
      if (onAbort) {
        xhr.addEventListener('abort', onAbort);
      }
      xhr.open(method, uri);
      if (opt.credentials !== void 0) {
        xhr.withCredentials = opt.credentials === 'include';
      } else if (globalExtendOptions.credentials !== void 0) {
        xhr.withCredentials = globalExtendOptions.credentials === 'include';
      }
      for (const key in opt.headers) {
        if (Object.hasOwnProperty.call(opt.headers, key)) {
          xhr.setRequestHeader(key, (opt.headers as Record<string, string>)[key]);
        }
      }
      if (abortId) {
        abortControllers.set(abortId, xhr);
      }
      xhr.send(data as XMLHttpRequestBodyInit);
    });
  }
  let signal: AbortSignal | undefined;

  if (abortId) {
    const controller = new AbortController();

    abortControllers.set(abortId, controller);
    signal = controller.signal;
    if (onAbort) {
      signal.onabort = onAbort as EventListener;
    }
  }
  // 使用 Fetch
  return fetch(uri, {
    body: data,
    signal: signal,
    ...rest,
  })
    .then(async (res) => {
      if (abortId && abortControllers.has(abortId)) {
        abortControllers.delete(abortId);
      }
      const interceptors = globalExtendOptions.interceptor;
      // 判断响应是否成功
      const isSuccess = isHttpSuccess(res.status);
      const [resp] = await Promise.all([
        getResponse(res, responseType),
        interceptors?.response?.(res, res),
        !isSuccess && interceptors?.httpError?.(res),
      ]);

      return resp as T;
    })
    .catch((err) => {
      return {
        status: 500,
        message: err.message,
        success: false,
      } as T;
    });
}

export function cancelRequest(abortId: string): void {
  const controller = abortControllers.get(abortId);

  if (controller) {
    controller.abort();
    abortControllers.delete(abortId);
  }
}

export function extend(opt: RequestExtendType): typeof request {
  Object.assign(globalExtendOptions, opt);
  return request;
}
