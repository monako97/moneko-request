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

/**
 * 请求配置项。
 */
export type RequestOption = {
  /**
   * 指定响应的数据类型
   * 可选值：`""`、`"arraybuffer"`、`"blob"`、`"document"`、`"json"`、`"text"`
   * @default 'json'
   */
  responseType?: XMLHttpRequestResponseType;
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
   * @default false
   */
  withCredentials?: boolean;
  /**
   * 作为请求体（body）发送的数据
   * 适用于 `POST`、`PUT`、`PATCH` 等方法
   */
  data?: Any;
  /**
   * 作为 URL 查询参数发送的数据。
   * 适用于 `GET`、`DELETE` 等方法，参数会被序列化到 URL 中
   */
  params?: Any;
  /**
   * 自定义请求头
   */
  headers?: Record<string, string>;
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
};

interface Response {
  __xhr__?: XMLHttpRequest;
  __headers__?: Record<string, string>;
  [key: string]: unknown;
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
