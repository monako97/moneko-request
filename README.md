# @moneko/request

`@moneko/request` 是一个网络请求库，提供了拦截器、自定义请求前缀、取消请求等功能，适用于浏览器和 NodeJS 的 HTTP 请求管理。

---

## 📌 安装

使用 `npm` 或 `yarn` 进行安装：

```sh
npm install @moneko/request
# 或
yarn add @moneko/request
```

---

## 🚀 快速使用

### 设置全局请求前缀和响应拦截器

你可以使用 `extend` 方法来扩展全局配置，例如添加 **请求前缀** 和 **拦截器**。

```typescript
// @/services/index.ts
import { extend } from '@moneko/request';
export { request } from '@moneko/request';

extend({
  interceptor: {
    /** 响应拦截器，可在此处处理通用错误、数据转换等 */
    response: (resp) => resp,
  },
  /** 设置全局请求前缀 */
  prefix: '/api',
});
```

---

## 🔥 使用 `request` 发送请求

`request` 方法用于发送 HTTP 请求

### 示例代码

```typescript
import { request } from '@/services';

/** 发送 GET 请求 */
request('/metrics');
// 实际请求：GET /api/metrics

/** 发送 GET 请求，附带 URL 参数 */
request('/metrics', { params: { id: 2 } });
// 实际请求：GET /api/metrics?id=2

/** 发送 POST 请求，包含 body 数据和 URL 参数 */
request('/metrics', { data: { name: 2 }, params: { id: 2 }, method: 'POST' });
// 实际请求：POST /api/metrics?id=2，body: data

/** 发送 POST 请求，使用自定义前缀 */
request('/metrics', { prefix: '/api2', data: { name: 2 }, method: 'POST' });
// 实际请求：POST /api2/metrics，body: data
```

---

## ⚙️ `request` 方法参数

```typescript
request(url: string, options?: RequestOption): Promise<GenericResponse>
```

| 参数      | 类型            | 说明                                     |
| --------- | --------------- | ---------------------------------------- |
| `url`     | `string`        | 请求的 API 路径（相对路径或绝对路径）。  |
| `options` | `RequestOption` | 请求的配置选项，如方法、参数、请求头等。 |

---

## 🛠 `RequestOption` 配置项

| 参数             | 类型                                                                                                                                                                                                                                                            | 说明                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `method`         | `'GET'` \| `'POST'` \| `'PUT'` \|`'DELETE'` \| `'HEAD'`\| `'OPTIONS'` \| `'PATCH'`\| `'PURGE'` \| `'LINK'` \| `'UNLINK'` \| `'PROPFIND'` \| `'MKCOL'` \| `'COPY'` \| `'MOVE'` \| `'LOCK'` \| `'UNLOCK'` \| `'REPORT'` \| `'SEARCH'` \| `'CONNECT'` \| `'TRACE'` | 请求方法，默认为 `'GET'`                                                       |
| `data`           | `any`                                                                                                                                                                                                                                                           | 请求体数据                                                                     |
| `params`         | `string[][]` \| `Dict<string \| number \| boolean>` \| `string` \| `URLSearchParams`                                                                                                                                                                            | URL 查询参数，会被序列化为 `key=value` 格式。                                  |
| `headers`        | `Record<string, string>` \| `Headers`                                                                                                                                                                                                                           | 自定义请求头。                                                                 |
| `responseType`   | `'json'`                                                                                                                                                                                                                                                        | `'text'` \| `'blob'` \| `'arraybuffer'` \| 指定响应的数据格式，默认 `'json'`。 |
| `credentials`    | `RequestCredentials`                                                                                                                                                                                                                                            | 是否携带 `cookie`                                                              |
| `prefix`         | `string`                                                                                                                                                                                                                                                        | 请求路径前缀，默认使用 `extend` 设置的前缀。                                   |
| `onProgress`     | `(progress: ProgressEvent) => void`                                                                                                                                                                                                                             | 上传/下载进度回调。                                                            |
| `onAbort`        | `(e: ProgressEvent \| Event) => void`                                                                                                                                                                                                                           | 请求被取消时的回调。                                                           |
| `abortId`        | `string`                                                                                                                                                                                                                                                        | 请求的唯一标识符，可用于取消请求。                                             |
| `compressedType` | `Omit<ResponseType, '' \| 'document'>`                                                                                                                                                                                                                          | 压缩提交数据上传的格式，默认 `'blob'`                                          |

---

## 📦 使用 Gzip 压缩请求数据

可以通过在 headers 中标记 `Content-Encoding`: `gzip` 来自动启用对请求数据的压缩

```typescript
import { request } from '@moneko/request';

/** 发送 POST 请求，使用自定义前缀 */
request('/metrics', {
  headers: {
    'content-encoding': 'gzip', // 将提交的数据以 Gzip 压缩
  },
  method: 'POST',
  data: {
    username: 'admin',
    password: '123AS',
  },
});
```

---

## 🛑 取消请求

可以使用 `abortId` 来标记请求，并在需要时取消它。

```typescript
import { request, cancelRequest } from '@moneko/request';

request('/metrics', { abortId: 'unique-id' })
  .then((res) => console.log(res))
  .catch((err) => console.error(err));

// 取消该请求
cancelRequest('unique-id');
```

---

## 🎯 自定义拦截器

`@moneko/request` 提供了 `interceptor` 选项，允许你在请求或响应时进行自定义处理，例如 **全局错误捕获**、**请求日志** 等。

```typescript
extend({
  interceptor: {
    /** 请求拦截器 */
    request: (options) => {
      console.log('请求发起:', options);
      return options;
    },
    /** 响应拦截器 */
    response: (resp) => {
      if (resp.code !== 200) {
        console.error('请求错误:', resp.message);
      }
      return resp;
    },
  },
});
```

---

## 📝 结语

`@moneko/request` 会根据需要自动选择合适的请求方案 `XMLHttpRequest` 或 `fetch`，支持拦截器、请求前缀、取消请求等功能，适用于日常 API 请求管理, 支持 IE
