// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export type Method =
  /** 从服务器获取数据 (幂等) */
  | 'GET'
  /** 从服务器删除资源 */
  | 'DELETE'
  /** 获取响应头而不返回响应体 */
  | 'HEAD'
  /** 获取目标资源的通信选项 */
  | 'OPTIONS'
  /** 向服务器提交数据以创建资源 */
  | 'POST'
  /** 更新服务器上的资源 (幂等) */
  | 'PUT'
  /** 部分更新服务器上的资源 */
  | 'PATCH'
  /** 清除指定资源的缓存 */
  | 'PURGE'
  /** 在两个资源之间建立链接关系 */
  | 'LINK'
  /** 解除两个资源之间的链接关系 */
  | 'UNLINK'
  /** 获取资源的属性 (用于 WebDAV) */
  | 'PROPFIND'
  /** 修改资源的属性 (用于 WebDAV) */
  | 'PROPPATCH'
  /** 在 WebDAV 中创建一个新的集合 (类似目录) */
  | 'MKCOL'
  /** 复制资源到新的位置 (用于 WebDAV) */
  | 'COPY'
  /** 移动资源到新的位置 (用于 WebDAV) */
  | 'MOVE'
  /** 锁定资源以防止修改 (用于 WebDAV) */
  | 'LOCK'
  /** 解锁之前锁定的资源 (用于 WebDAV) */
  | 'UNLOCK'
  /** 获取有关资源的特定报告 (用于 WebDAV/DeltaV) */
  | 'REPORT'
  /** 在资源上执行搜索查询 */
  | 'SEARCH'
  /** 建立到服务器的隧道 (通常用于 HTTPS 代理) */
  | 'CONNECT'
  /** 回显接收到的请求，通常用于诊断和调试 */
  | 'TRACE';

type ResponseType =
  | ''
  | 'arraybuffer'
  | 'blob'
  | 'document'
  | 'json'
  | 'text'
  | 'form-data'
  | 'bytes';

export interface Dict<T> {
  [key: string]: T | undefined;
}
export interface IncomingHeaders extends Dict<string | string[]> {
  accept?: string;
  'accept-encoding'?: string;
  'accept-language'?: string;
  'accept-patch'?: string;
  'accept-ranges'?: string;
  'access-control-allow-credentials'?: string;
  'access-control-allow-headers'?: string;
  'access-control-allow-methods'?: string;
  'access-control-allow-origin'?: string;
  'access-control-expose-headers'?: string;
  'access-control-max-age'?: string;
  'access-control-request-headers'?: string;
  'access-control-request-method'?: string;
  age?: string;
  allow?: string;
  'alt-svc'?: string;
  authorization?: string;
  'cache-control'?: string;
  connection?: string;
  'content-disposition'?: string;
  'content-encoding'?: string;
  'content-language'?: string;
  'content-length'?: string;
  'content-location'?: string;
  'content-range'?: string;
  'content-type'?: string;
  cookie?: string;
  date?: string;
  etag?: string;
  expect?: string;
  expires?: string;
  forwarded?: string;
  from?: string;
  host?: string;
  'if-match'?: string;
  'if-modified-since'?: string;
  'if-none-match'?: string;
  'if-unmodified-since'?: string;
  'last-modified'?: string;
  location?: string;
  origin?: string;
  pragma?: string;
  'proxy-authenticate'?: string;
  'proxy-authorization'?: string;
  'public-key-pins'?: string;
  range?: string;
  referer?: string;
  'retry-after'?: string;
  'sec-websocket-accept'?: string;
  'sec-websocket-extensions'?: string;
  'sec-websocket-key'?: string;
  'sec-websocket-protocol'?: string;
  'sec-websocket-version'?: string;
  'set-cookie'?: string[];
  'strict-transport-security'?: string;
  tk?: string;
  trailer?: string;
  'transfer-encoding'?: string;
  upgrade?: string;
  'user-agent'?: string;
  vary?: string;
  via?: string;
  warning?: string;
  'www-authenticate'?: string;
}
/**
 * 请求配置项。
 */
export interface RequestOption extends Omit<RequestInit, 'body' | 'signal' | 'headers'> {
  /**
   * 指定响应的数据类型
   * 可选值：`"arraybuffer"`、`"blob"`、`"json"`、`"text"`、`"form-data"`
   * @default 'json'
   */
  responseType?: ResponseType;
  /**
   * 请求的 HTTP 方法
   * @default 'GET'
   */
  method?: Method;
  /**
   * 上传或下载过程中的进度回调函数
   * @param progress 上传或下载的进度事件
   */
  onProgress?(progress: ProgressEvent<XMLHttpRequestEventTarget>): void;
  /**
   * 请求被中止时的回调函数
   * @param e 请求中止的事件对象
   */
  onAbort?(e: ProgressEvent<XMLHttpRequestEventTarget>): void;
  /**
   * 是否在请求中携带跨域凭据（如 Cookies）
   * @default "include"
   */
  credentials?: RequestCredentials;
  /**
   * 作为请求体（body）发送的数据
   * 适用于 `POST`、`PUT`、`PATCH` 等方法
   */
  data?: BodyInit | null | Any;
  /**
   * 作为 URL 查询参数发送的数据。
   * 适用于 `GET`、`DELETE` 等方法，参数会被序列化到 URL 中
   */
  params?: string | string[][] | Dict<string | number | bigint | boolean> | URLSearchParams;
  /**
   * 自定义请求头
   * @example
   * request('/update', {
   *   headers: {
   *     'content-encoding': 'gzip', // 将提交的数据以 Gzip 压缩
   *   },
   *   data: { xxxxx: 'data' }
   * });
   */
  headers?: HeadersInit & IncomingHeaders;
  /**
   * 请求的唯一标识符，用于取消请求
   * 通过 `abortId` 关联的请求可以被中止
   */
  abortId?: string;
  /**
   * 请求的 URL 前缀
   * 用于在基础 URL 之外追加额外的路径前缀
   */
  prefix?: string;
  /**
   * 压缩提交数据上传的格式
   * @description 需先指定压缩算法;
   * @default 'blob'
   * @example
   * request('/upload-file', {
   *   headers: {
   *     'content-encoding': 'gzip',
   *   },
   *   compressedType: 'bytes',
   *   data: { xxxxx: 'data' }
   * });
   */
  compressedType?: Omit<ResponseType, '' | 'document'>;
}

interface Response {
  __xhr__?: XMLHttpRequest;
  __headers__?: RequestOption['headers'];
  [key: string]: Any;
}

/** 通用响应结构 */
export interface GenericResponse<T = Any> extends Response {
  message?: string;
  result: T;
  status?: number;
  success?: boolean;
}

/** 通用分页响应结构 */
export type PageResponse<T = Any> = GenericResponse<{
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
}>;
/**
 * 表示 Blob 类型的响应结构。
 * 继承自 `GenericResponse` 和 `Blob`，用于处理文件下载等场景。
 */
export interface BlobResponse extends GenericResponse, Blob {
  /**
   * 文件名（从 `content-disposition` 响应头中提取）
   * 如果服务器未提供 `content-disposition`，此字段可能为空
   */
  filename?: string;
}

export const ContentDispositionRegExp: RegExp = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
export const HttpRegExp: RegExp = /^(http(s|):\/\/)|^(\/\/)/;
const UriSepRegExp: RegExp = /\/+/g;

export function parseUrl(uri: string): string {
  return uri.replace(UriSepRegExp, '/');
}
export function withResponse<T>(
  resp: T,
  response: globalThis.Response | XMLHttpRequest,
  headers: RequestOption['headers'],
): Response {
  const protoWithExtras = Object.create(Object.getPrototypeOf(resp));

  Object.defineProperty(protoWithExtras, '__xhr__', {
    value: response,
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

  return resp as unknown as Response;
}
export async function getResponse(
  res: globalThis.Response,
  responseType: RequestOption['responseType'],
): Promise<globalThis.Response | Response | ArrayBuffer | string | FormData | Uint8Array> {
  let resp: globalThis.Response | Response | ArrayBuffer | string | FormData | Uint8Array;

  if (res.ok) {
    switch (responseType) {
      case '':
        resp = res;
        break;
      case 'form-data':
        resp = await res.formData();
        break;
      case 'arraybuffer':
        resp = await res.arrayBuffer();
        break;
      case 'bytes':
        resp = await res.bytes();
        break;
      case 'blob': {
        resp = (await res.blob()) as BlobResponse;
        const contentDisposition = res.headers.get('content-disposition');

        if (contentDisposition) {
          const matches = ContentDispositionRegExp.exec(contentDisposition);

          if (matches && matches[1]) {
            resp.filename = decodeURIComponent(matches[1]).replace(/(^UTF-8|)['"]/g, '');
          }
        }
        break;
      }
      case 'json':
        resp = await res.json();
        break;
      case 'text':
      case 'document':
      default:
        resp = await res.text();
        break;
    }
  } else {
    try {
      resp = {
        status: res.status,
        message: res.statusText,
        success: false,
        ...(await res.json()),
      };
    } catch {
      resp = {
        status: res.status,
        message: res.statusText,
        success: false,
      };
    }
  }
  return withResponse(resp, res, res.headers as RequestOption['headers']);
}
