# 平潭二中移动校园 — PingTan Smart Campus

基于 Next.js + Supabase 的智慧校园 Web App，为教职工提供食堂报饭、设施报修、通知公告等服务。

## 技术栈

- **前端**：Next.js 16 (App Router + Proxy) + React 19 + TypeScript + TailwindCSS v4
- **后端**：Supabase (Auth + PostgreSQL + Storage)
- **部署**：Vercel / 自托管

---

## 快速开始

### 1. 创建 Supabase 项目

1. 访问 [https://supabase.com](https://supabase.com) 并注册/登录
2. 点击 **New Project**，填写项目名称（如 `pingtan`），选择数据库密码和区域
3. 创建完成后，在 **Settings > API** 页面获取：
   - `Project URL`（即 `NEXT_PUBLIC_SUPABASE_URL`）
   - `anon public key`（即 `NEXT_PUBLIC_SUPABASE_ANON_KEY`）

### 2. 执行数据库 Schema

1. 在 Supabase 控制台左侧点击 **SQL Editor**
2. 点击 **New query**
3. 将 `supabase/schema.sql` 文件的全部内容粘贴进去
4. 点击 **Run** 执行
5. 执行成功后，可在 **Table Editor** 中看到 6 张表：
   - `profiles`、`meal_menus`、`meal_bookings`、`repair_tickets`、`repair_images`、`notifications`
6. 在 **Storage** 页面确认已创建 `repair-images` bucket

### 3. 配置环境变量

在项目根目录创建 `.env.local` 文件：

```env
NEXT_PUBLIC_SUPABASE_URL=你的Supabase项目URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase匿名Key
```

### 4. 安装依赖并运行

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可访问。

### 5. 创建第一个管理员账号

1. 在登录页面点击 **注册新账号**
2. 填写姓名、手机号、密码即可注册，邮箱可选
3. 注册成功后，前往 Supabase 控制台
4. 打开 **Table Editor > profiles**
5. 找到刚注册的用户行，将 `role` 字段从 `teacher` 改为 `super_admin`
6. 保存即可

角色可设置为：
- `teacher`：普通教职工
- `canteen_admin`：报饭管理员，可管理菜单、报饭汇总和通知
- `repair_admin`：后勤管理员，可处理报修工单和通知
- `super_admin`：总管理员，可管理全部后台功能和用户角色

---

## 项目结构

```
PingTan/
├── src/
│   ├── app/                    # 页面路由
│   │   ├── layout.tsx          # 全局布局
│   │   ├── page.tsx            # 根页面（重定向到 /login）
│   │   ├── login/page.tsx      # 登录/注册页
│   │   ├── dashboard/page.tsx  # 首页 Dashboard
│   │   ├── canteen/page.tsx    # 食堂报饭
│   │   ├── repair/page.tsx     # 设施报修
│   │   ├── profile/page.tsx    # 我的页面
│   │   └── admin/page.tsx      # 管理后台
│   ├── components/             # 共享组件
│   ├── hooks/                  # React Hooks
│   └── lib/                    # 工具库、服务层 & Supabase 客户端
├── supabase/
│   └── schema.sql              # 数据库表结构 + RLS 策略
├── .env.local                  # 环境变量（不提交到 Git）
└── README.md
```

---

## 功能清单

| 模块 | 功能 | 状态 |
|------|------|------|
| 用户认证 | 手机号 + 密码注册；邮箱/手机号 + 密码登录；手机号不发送验证码 | ✅ |
| 路由保护 | 未登录自动跳转 login | ✅ |
| 首页 | 动态问候、快捷入口、通知面板 | ✅ |
| 食堂报饭 | 日期选择、菜单展示、预订/取消并保留历史 | ✅ |
| 设施报修 | 类型选择、表单填写、图片上传、工单列表 | ✅ |
| 通知公告 | 从 notifications 表读取展示 | ✅ |
| 管理后台 | 菜单管理、报饭汇总、工单处理、通知发布、用户角色 | ✅ |
| 退出登录 | 清除 session 跳转 login | ✅ |

---

## Supabase 配置说明

### Authentication 设置

在 Supabase 控制台的 **Authentication > Providers** 中：
- 确保 **Email** 已启用
- 不需要启用 **Phone** 短信验证码；注册不会调用 Supabase Phone Auth
- 手机号注册会用手机号生成内部 Auth Email，真实邮箱仅作为选填联系方式保存
- 手机号或选填邮箱登录会先在 `profiles` 中解析到内部 Auth Email，再用密码登录
- 请在 **Authentication > Settings** 中关闭 Email 确认，否则内部 Auth Email 也会被要求确认

### Storage 设置

- `repair-images` bucket 已在 schema.sql 中自动创建
- 该 bucket 为 public（可公开访问图片 URL）
- 认证用户可上传文件

---

## 开发说明

- 原始静态 HTML 页面保留在 `login_and_registration/`、`dashboard/`、`canteen_booking/`、`facility_repair/` 文件夹中作为设计参考
- 所有页面保持中文界面
- 设计 token（颜色、字体、阴影）与原始 HTML 保持一致

---

© 2024 平潭二中信息化中心
