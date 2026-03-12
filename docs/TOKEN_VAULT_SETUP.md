# Auth0 Token Vault 配置清单

用于 Google Calendar 的 Connected Accounts / Token Vault 完整配置步骤。

---

## 一、Auth0 Dashboard 配置

### 1. 启用 My Account API

1. 进入 **Applications** → **APIs**（注意：是 Applications 下的 APIs，不是 Authentication）
2. 在页面顶部查找 **My Account API** 的横幅（banner）
3. 若看到 **Activate** 按钮，点击激活
4. 激活后，My Account API 会出现在 API 列表中，点击进入
5. 在 **Settings** 标签中可看到 **Identifier**，格式为：`https://{你的域名}/me/`  
   - 你的应为：`https://dev-khsesxrmz0uruqho.us.auth0.com/me/`

**注意**：My Account API 目前处于 Limited Early Access。若在 APIs 列表中完全看不到它，可能需要联系 Auth0 支持开通。

### 2. 配置应用 Grant Types

1. 进入 **Applications** → **Applications**
2. 选择你的应用（Client ID: `ZDj4aVPP7xp0S00GLpWZlGwN3y01eV7l`）
3. 打开 **Settings** → **Advanced Settings** → **Grant Types**
4. 勾选：
   - ✅ **Authorization Code**
   - ✅ **Refresh Token**
   - ✅ **Token Vault**（或 `urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token`）
5. 点击 **Save Changes**

### 3. 授权 My Account API 的 scope

1. 仍在 **Applications** → 你的应用
2. 打开 **APIs** 标签
3. 找到 **My Account API**，点击 **Authorize**
4. 勾选 scope：**`create:me:connected_accounts`**
5. 保存

### 4. 配置 Google 连接（Connected Accounts for Token Vault）

1. 进入 **Authentication** → **Social**
2. 点击 **Google**（若没有则先创建）
3. 在 Google 连接设置中：
   - 填入 Google OAuth Client ID 和 Secret（你已有）
   - 在 **Permissions** 中勾选 **Offline Access**（必须，用于 refresh token）
4. 进入 **Applications** 标签
5. 确保你的应用已启用此连接
6. 若使用 Token Vault，需在连接中启用 **Connected Accounts for Token Vault**（在连接设置里查找相关选项）

### 5. 关闭 Refresh Token Rotation（推荐）

1. **Applications** → 你的应用 → **Settings**
2. 找到 **Refresh Token Rotation** 或 **Refresh Token** 区域
3. 关闭 **Allow Refresh Token Rotation**

### 6. 跳过重复的 Authorize 同意页（可选）

若每次连接都弹出 "Authorize App" 同意页，需在 **API** 上启用跳过同意：

1. 进入 **Applications** → **APIs**（注意：是 APIs，不是 Applications）
2. 找到 **My Account API**，点击进入
3. 打开 **Settings** 标签
4. 找到 **Allow Skipping User Consent** 开关，**开启**
5. 保存

说明：该设置在 API 上，不在 Application 上。Dashboard 创建的应用默认已是 First-Party，无需额外配置。

### 6. MFA 策略（如启用）

若 MFA 设为 **Always**，需改为 **Never** 或 **Optional**，否则 Token Vault 可能无法获取 access token。

---

## 二、环境变量检查

`.env.local` 中需包含：

```env
AUTH0_SCOPE='openid profile email offline_access'
```

`offline_access` 必须存在，否则无法获取 refresh token。

---

## 三、验证步骤

1. **登录应用** → 以 Creator 身份进入 Schedule 页面
2. **点击 Connect Google Calendar** → 应跳转到 Auth0 的 Google 授权页
3. **完成授权** → 应跳回 Schedule 页面并显示 "Connected"
4. **调用** `/api/google-calendar/status` → 应返回 `{ connected: true }`

---

## 四、Debug 连接失败

当出现 `error=connect_failed` 时：

1. **查看终端日志**：运行 `npm run dev` 的终端会输出 `[Connect Google Calendar]` 开头的错误详情
2. **查看 URL**：开发环境下，重定向 URL 会包含 `error_detail` 参数，显示具体错误信息
3. **常见错误对照**：
   - `missing_refresh_token` → 当前 session 无 refresh token。应用会自动跳转到重新登录页（带 prompt=consent），登录后会再次尝试连接
   - `no_session` / `MISSING_SESSION` → 未登录或 session 过期，重新登录
   - `access_denied` / `insufficient_scope` → 应用未授权 My Account API 的 `create:me:connected_accounts`
   - `invalid_grant` → Token Vault 配置问题，检查 Grant Types 和 Refresh Token Rotation
   - `403` / `Forbidden` → My Account API 未激活或未正确配置

4. **确保能获取 refresh token**：Auth0 应用需启用 **Refresh Token** grant，且 `AUTH0_SCOPE` 包含 `offline_access`

## 五、常见错误排查

| 现象 | 可能原因 |
|------|----------|
| 点击连接后报错或白屏 | My Account API 未启用，或应用未授权 `create:me:connected_accounts` |
| 授权后仍显示未连接 | Token Vault grant 未启用，或 Google 连接未开启 Offline Access |
| `getAccessTokenForConnection` 报错 | Refresh Token Rotation 未关闭，或 Google 连接未正确配置 Token Vault |
| 401 Unauthorized | 未登录或 session 失效 |

---

## 六、Accept 后不跳转的排查

若点击 Authorize 的 Accept 后无跳转（consent 返回 200 而非 302）：

1. **Allowed Callback URLs**：在 **Applications** → 你的应用 → **Settings** 中，确认包含：
   - `http://localhost:3000/auth/callback`
   - 若使用 127.0.0.1，也添加 `http://127.0.0.1:3000/auth/callback`

2. **Allowed Logout URLs**：确认包含 `http://localhost:3000`

3. **Application Type**：必须是 **Regular Web Application**

4. **浏览器控制台**：打开 DevTools → Console，点击 Accept 后查看是否有 JavaScript 报错

5. **Network 详情**：在 consent 请求上右键 → Copy → Copy as cURL，查看响应头是否包含 `Location` 重定向

## 七、Auth0 文档参考

- [Configure Token Vault](https://auth0.com/docs/secure/call-apis-on-users-behalf/token-vault/configure-token-vault)
- [Connected Accounts for Token Vault](https://auth0.com/docs/secure/call-apis-on-users-behalf/token-vault/connected-accounts-for-token-vault)
- [My Account API](https://auth0.com/docs/manage-users/my-account-api)
