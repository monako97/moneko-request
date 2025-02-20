# @moneko/request

## 设置响应拦截器、请求前缀

```typescript
// @/services/index.ts
import { extend } from '@moneko/request';
export { request } from '@moneko/request';

extend({
  interceptor: {
    response: (resp) => resp,
  },
  prefix: '/api',
});

```

## 调用request案例

```typescript
import { request } from '@/services';

export const getApi = () => request('/metrics'); // GET: /api/metrics
export const getApiID = () => request('/metrics', { data: { id: 2 } }); // GET: /api/metrics?id=2
export const postApi = (data = {}) => request('/metrics', { data: data, method: 'POST' }); // POST: /api/metrics
export const postApi2 = (data = {}) => request('/metrics', { prefix: '/api2', data: data, method: 'POST' }); // POST: /api2/metrics

```
