# NotionNext — 开发须知

## 核心架构

- **框架**: Next.js 14 + React 18 + Tailwind CSS 3，部署在 Vercel
- **数据源**: Notion API，通过 `notion-client` + `react-notion-x` 渲染
- **主题系统**: `themes/` 目录下每个文件夹即一个主题；`blog.config.js` 的 `THEME` 决定当前主题，也可通过 URL 参数 `?theme=xxx` 切换
- **配置优先级**: Notion 数据库配置表 > 环境变量 > `blog.config.js`（由 `lib/config.js` 的 `siteConfig()` 统一读取）
- `conf/` 目录下所有配置文件通过 `...require()` 合并到 `blog.config.js`，修改需重启

## 关键命令

```bash
npm run dev          # 开发
npm run build        # 构建（必须 cross-env BUILD_MODE=true next build）
npm run start        # 生产启动
npm run lint         # ESLint 检查（构建时自动忽略 ESLint 错误）
npm run lint:fix     # 自动修复
npm run type-check   # tsc --noEmit
npm run format       # Prettier 格式化
npm run test         # Jest 测试（含路径别名）
npm run export       # 静态导出
npm run pre-commit   # 提交前：lint:fix → format → type-check
```

## 代码规范

- **Prettier**: 单引号、无分号、无尾逗号、JSX 单引号
- **ESLint**: `next lint` 构建时跳过 (`ignoreDuringBuilds: true`)
- **TypeScript**: `strict: true`，`exactOptionalPropertyTypes: true`
- **路径别名**: `@/` → 项目根目录（jsconfig.json / tsconfig.json 定义）

## 暗色模式

- Tailwind `darkMode: 'class'`，基于 `<html>` 的 `dark` class 切换
- `blog.config.js` 中 `APPEARANCE` 可设 `light` / `dark` / `auto`
- 深色/浅色 favicon 通过 MutationObserver 监听 `<html>` class 动态替换

## Favicon

- `public/favicon/{light,dark}/` 目录下分主题存放多尺寸图标
- 修改 favicon 需同步更新：`blog.config.js`（BLOG_FAVICON / BLOG_FAVICON_DARK）+ `components/SEO.js`（JSX 标签 + 切换逻辑）+ `lib/utils/rss.js`

## 测试

- Jest + @testing-library/react，`jest.config.js` 通过 `next/jest` 创建
- 支持路径别名 `@/`（见 `moduleNameMapper`）
- `__tests__/` 目录分 `components/` 和 `lib/`

## 构建与部署

- `post-build` 脚本自动生成 sitemap（`next-sitemap`）
- 构建时会删除 `public/sitemap.xml` 避免与动态路由冲突
- `patch-package` 在 `postinstall` 时自动应用 `patches/` 补丁
- 支持多语言：`NOTION_PAGE_ID` 用逗号分隔多个页面 ID，可带语言前缀（如 `zh:xx,en:xx`）
- CI: CodeQL 分析、Docker 镜像构建、URL 推送、同步工作流

## 其他

- Node >= 20，`.npmrc` 设置了 `engine-strict=true`
- `.env.example` 可参考环境变量含义
- 有 `scripts/quality-check.js` 质量检查脚本
- 有 `health-check` / `final-validation` 等辅助脚本
- Clerk 认证可选（通过环境变量开启）
