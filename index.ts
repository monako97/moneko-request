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
  // eslint-disable-next-line no-unused-vars
  onUploadProgress?: (progress: ProgressEvent<XMLHttpRequestEventTarget>) => void;
  withCredentials?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: { [key: string]: any } | BodyInit | false | Array<any>;
  headers?: Record<string, string>;
  showLoading?: boolean;
  abortId?: string;
};

export interface ResponseBlob extends ResponseBody, Blob {
  filename: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ResponseBody<T = any> {
  status: number;
  success: boolean;
  message: string;
  result: T;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ResponsePageData<T = any> extends ResponseBody<T> {
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

function getXhr(): XMLHttpRequest {
  let xhr;

  if (window.ActiveXObject) {
    try {
      xhr = new window.ActiveXObject('Msxml2.XMLHTTP');
    } catch (e) {
      xhr = new window.ActiveXObject('Microsoft.XMLHTTP');
    }
  } else if (window.XMLHttpRequest) {
    xhr = new XMLHttpRequest();
  }
  return xhr;
}

const allXhr: Record<string, XMLHttpRequest | null> = {};

function responseHeadersToJson(headerString: string) {
  const headers: Record<string, string> = {};
  const hl = headerString.split('\r\n');

  for (let i = 0, len = hl.length; i < len; i++) {
    const h = hl[i].split(': ');

    if (Array.isArray(h) && h.length > 1) headers[h[0]] = h[1];
  }
  return headers;
}

const stringifyData = ['POST', 'PUT', 'DELETE', 'PATCH'];

export function request<T extends ResponseBody>(url: string, opt: RequestOption = {}): Promise<T> {
  return new Promise((res) => {
    const method = opt.method?.toLocaleUpperCase() || 'GET';
    const isFormData: boolean = opt.data instanceof FormData;
    const prefix = /^(http(s|):\/\/)|^(\/\/)/.test(url) ? '' : request.prototype.prefixUrl || '';
    let uri = url;

    opt.headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Requested-With': 'XMLHttpRequest',
      ...opt.headers,
    };

    const xhr = getXhr();

    xhr.responseType = opt.responseType || 'json';

    if (xhr.readyState === xhr.UNSENT) {
      if (request.prototype.interceptors?.request) {
        const nopt = request.prototype.interceptors?.request({
          url,
          ...opt,
        });

        if (nopt) {
          Object.assign(opt, nopt);
        }
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

      uri = url + '?' + params.toString();
    }
    xhr.addEventListener('readystatechange', function () {
      /**
       * XMLHttpRequest对象
       * 0：还没有完成初始化
       * 1：载入，开始发送请求
       * 2：载入完成，请求发送完成
       * 3：解析，开始读取服务器的响应
       * 4：完成，读取服务器响应结束
       */
      if (xhr.readyState === xhr.DONE) {
        if (request.prototype.interceptors?.response) {
          request.prototype.interceptors?.response(xhr.response);
        }
        if (opt.abortId && Object.prototype.hasOwnProperty.call(allXhr, opt.abortId)) {
          allXhr[opt.abortId] = null;
          delete allXhr[opt.abortId];
        }

        if (xhr.response) {
          const headers = responseHeadersToJson(xhr.getAllResponseHeaders());
          const disposition = /;filename=(.*)$/.exec(headers['content-disposition']);

          if (Object.prototype.toString.call(xhr.response) === '[object Blob]') {
            // filename
            xhr.response.filename = disposition ? disposition[1] : null;
            return res(xhr.response);
          }
          const resp = Object.create(
            {
              getResponseHeader: (name: string) => xhr.getResponseHeader(name),
              getAllResponseHeaders: () => xhr.getAllResponseHeaders(),
              response: xhr.response,
              headers: headers,
            },
            Object.getOwnPropertyDescriptors(xhr.response)
          );

          return res(resp);
        }
        return res({
          status: xhr.status,
          message: xhr.statusText,
          success: false,
        } as unknown as T);
      }
    });
    if (opt.onUploadProgress) {
      xhr.addEventListener('progress', opt.onUploadProgress);
    }

    xhr.open(method || 'GET', prefix + uri);
    if (opt.withCredentials) {
      xhr.withCredentials = true;
    }
    if (opt.headers) {
      for (const key in opt.headers) {
        if (Object.hasOwnProperty.call(opt.headers, key)) {
          xhr.setRequestHeader(key, opt.headers[key]);
        }
      }
    }

    if (opt.abortId) {
      allXhr[opt.abortId] = xhr;
    }
    xhr.send(opt.data as XMLHttpRequestBodyInit | Document);
  });
}

export const cancelRequest = (abortId: string) => {
  if (Object.prototype.hasOwnProperty.call(allXhr, abortId)) {
    allXhr[abortId]?.abort();

    allXhr[abortId] = null;
    delete allXhr[abortId];
  }
};

export type InterceptorRequestType = RequestOption & {
  url: string;
};

export type InterceptorType = {
  /** 请求拦截器 */
  // eslint-disable-next-line no-unused-vars
  request?: (option: InterceptorRequestType) => RequestOption;
  /** 响应拦截器 */
  // eslint-disable-next-line no-unused-vars
  response?: (response: XMLHttpRequest['response']) => void;
};

export type RequestExtendType = {
  /**
   * 配置请求拦截器
   **/
  interceptor?: InterceptorType;
  /** 请求前缀 */
  prefixUrl?: string;
};

export const extend = (opt: RequestExtendType) => {
  request.prototype.interceptors = opt.interceptor;
  request.prototype.prefixUrl = opt.prefixUrl;
};
