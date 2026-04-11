# PostgreSQL 数据库迁移指南

## 已完成的修改

1. ✅ `prisma/schema.prisma` - 改为 PostgreSQL
2. ✅ `.env` - 数据库连接配置
3. ✅ `.env.example` - 环境变量模板
4. ✅ `.gitignore` - 排除敏感环境变量

## 后续步骤

### 1. 获取 PostgreSQL 连接字符串

#### 方案 A: 使用 Neon (免费,推荐)
1. 注册 https://neon.tech
2. 创建项目 `hotel-artwork`
3. 获取连接字符串,格式如:
   ```
   postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
   ```
4. 复制到 `.env` 的 `DATABASE_URL`

#### 方案 B: 本地安装 PostgreSQL
```bash
# macOS
brew install postgresql
brew services start postgresql

# 创建数据库
createdb hotel_artwork

# .env 中配置
DATABASE_URL="postgresql://localhost:5432/hotel_artwork?schema=public"
```

#### 方案 C: 使用 Docker
```bash
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=hotel_artwork \
  -p 5432:5432 \
  postgres:16

# .env 中配置
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hotel_artwork?schema=public"
```

### 2. 初始化数据库

```bash
# 生成 Prisma 客户端
npx prisma generate

# 推送数据库架构
npx prisma db push

# (可选) 填充测试数据
npm run db:seed
```

### 3. 本地测试

```bash
npm run dev
```

访问 http://localhost:3000

### 4. 部署配置

#### Cloudflare Pages / Vercel

在项目设置的环境变量中添加:
- `DATABASE_URL`: 你的 PostgreSQL 连接字符串

### 5. 提交并推送

```bash
git add -A
git commit -m "migrate database from sqlite to postgresql"
git push
```

## 数据库连接字符串格式

```
postgresql://用户名:密码@主机:端口/数据库名?sslmode=require
```

示例:
```
postgresql://john:abc123@ep-white-water-123456.us-east-2.aws.neon.tech/hotel_artwork?sslmode=require
```
