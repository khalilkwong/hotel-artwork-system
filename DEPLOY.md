# 部署到 Vercel 完整指南

## 前提条件
- 你需要一个 GitHub 账号
- 你需要一个 Vercel 账号(可以用 GitHub 登录)

## 部署步骤

### 1. 推送到 GitHub

如果你还没有把项目推送到 GitHub:

```bash
# 初始化 git (如果还没有)
git init
git add .
git commit -m "Initial commit"

# 在 GitHub 创建新仓库,然后:
git remote add origin https://github.com/YOUR_USERNAME/hotel-artwork-system.git
git branch -M main
git push -u origin main
```

### 2. 部署到 Vercel

#### 方式 A: 通过 Vercel 官网部署
1. 访问 https://vercel.com
2. 用 GitHub 账号登录
3. 点击 "Add New Project"
4. 选择你的 hotel-artwork-system 仓库
5. 点击 "Deploy"
6. 等待 2-3 分钟,部署完成!

#### 方式 B: 通过 Vercel CLI 部署
```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel
```

### 3. 数据库配置

**重要:** 项目使用 SQLite,部署到 Vercel 后需要注意:

- Vercel 是无服务器平台,每次请求可能是新的容器
- SQLite 文件不会持久化保存

**解决方案:**

#### 方案 1: 使用 Turso (推荐,免费)
Turso 是基于 libsql 的边缘数据库,兼容 SQLite API:

1. 注册 https://turso.tech
2. 创建数据库
3. 获取连接 URL 和 token
4. 修改 `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

5. 在 Vercel 环境变量中添加:
   - `DATABASE_URL`: `file:local.db` (开发用)
   
或者改用 Turso:
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

#### 方案 2: 使用 Neon PostgreSQL (推荐,免费)
Neon 提供免费 PostgreSQL:

1. 注册 https://neon.tech
2. 创建数据库项目
3. 获取连接字符串
4. 修改 `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

5. 在 Vercel 环境变量中设置 `DATABASE_URL`
6. 运行 `npx prisma generate` 和 `npx prisma db push`

#### 方案 3: 使用 Vercel Postgres
Vercel 自带的 PostgreSQL:

1. 在 Vercel 项目设置中,点击 "Storage"
2. 创建 Vercel Postgres 数据库
3. 自动配置 `POSTGRES_URL` 环境变量
4. 修改 schema.prisma 使用 postgresql

### 4. 更新 Prisma 配置

部署前需要确保 Prisma 能正确生成:

```bash
# 生成 Prisma 客户端
npx prisma generate

# 推送数据库架构(部署后执行)
npx prisma db push
```

### 5. Vercel 环境变量配置

在 Vercel 项目设置 → Environment Variables 中添加:

- `DATABASE_URL`: 你的数据库连接字符串

### 6. 部署后访问

部署完成后,Vercel 会给你一个域名:
`https://hotel-artwork-system.vercel.app`

你可以:
- 在 Vercel 设置中绑定自定义域名
- 分享给任何人直接访问

## 免费额度

Vercel 免费 Hobby 计划:
- 无限带宽
- 100GB 带宽/月
- 自动 HTTPS
- 自动部署预览

## 注意事项

1. **数据库持久化**: SQLite 不适合 Vercel 无服务器部署,建议改用 PostgreSQL
2. **文件上传**: 如果有图片上传,需要使用云存储(如 Vercel Blob、AWS S3)
3. **环境变量**: 确保所有敏感信息都在环境变量中,不要硬编码

## 快速部署命令

```bash
# 安装 vercel cli
npm i -g vercel

# 登录
vercel login

# 首次部署
vercel

# 后续部署到生产
vercel --prod
```
