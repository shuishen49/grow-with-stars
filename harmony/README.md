# 好习惯积分 HarmonyOS 外壳

这是一个独立的 HarmonyOS NEXT Stage 工程，不需要在本机安装 DevEco Studio 才能编辑。它使用 ArkWeb 加载主仓库构建出的 React `dist`，因此继续使用主项目原来的 Supabase 数据库。

## 当前配置

- Bundle name：`com.shuishen49.growwithstars.harmony`
- 应用名称：`好习惯积分`
- 数据库：沿用主项目 Supabase 配置
- 华为 CloudDB 和云函数：暂未接入

## 更新网页资源

在主项目根目录执行 `npm run build`，再把 `dist` 的内容复制到 `entry/src/main/resources/rawfile/`，并把 `index.html` 中 `/assets/`、`/icons/`、`/ui/` 的绝对路径改成相对路径。当前目录已经包含一份可用快照。

## GitHub Actions 构建

GitHub Actions 可以负责构建和提供下载，但必须在仓库 Secrets 中提供华为 Command Line Tools 压缩包地址：`HARMONY_TOOLS_URL`。工具链和签名证书不随仓库提交；没有工具链或签名配置时，GitHub 不能生成可安装包。

官方命令行构建任务：

```bash
hvigorw --mode module -p product=default -p module=entry@default -p buildMode=debug assembleHap
```

`assembleHap` 生成 HAP；发布到应用市场通常还需要 release 构建和有效签名。

构建工作流已启用手动触发和鸿蒙目录变更触发。
