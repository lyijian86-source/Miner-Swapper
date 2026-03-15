# Velvet Mines

一款界面美观、极简主义、带轻奢质感的扫雷游戏。项目零依赖，下载后即可直接运行，也适合放到 GitHub 上公开展示或部署为在线版本。

## 快速开始

### 直接在电脑上玩

1. 下载仓库 ZIP 并解压。
2. 双击 `Launch-Velvet-Mines.bat`。
3. 或者直接打开 `index.html`。

### 基本操作

- 左键打开格子
- 右键插旗
- 移动端长按插旗
- 点击已揭开的数字，且周围旗子数量正确时，可快速展开邻格
- 按 `R` 可快速重开

## 特色

- 高级感玻璃拟态面板与香槟金配色
- 三档难度，首击安全
- 本地保存最佳成绩、胜率和连胜纪录
- 移动端可玩，桌面端体验更佳
- 可直接部署到 GitHub Pages

## 提交到 GitHub

如果当前目录还不是 Git 仓库，可以在项目根目录执行：

```powershell
git init
git add .
git commit -m "feat: launch velvet mines"
git branch -M main
git remote add origin https://github.com/<your-name>/<your-repo>.git
git push -u origin main
```

如果你已经在现有仓库里，并且当前分支是 `master`，也可以直接：

```powershell
git add .
git commit -m "feat: launch velvet mines"
git push -u origin master
```

## 在线发布

仓库已包含 GitHub Pages 工作流文件：

- 推送到 `main` 后，会自动部署静态站点
- 第一次使用时，在 GitHub 仓库的 `Settings -> Pages` 中确认来源为 `GitHub Actions`

发布成功后，别人不下载也可以直接在网页上玩。

## 打包一个下载包

如果你想把适合分享的 ZIP 包放到 GitHub Releases，可以在项目根目录运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\package-release.ps1
```

执行后会生成：

```text
release\Velvet-Mines-windows.zip
```

别人下载并解压后，双击 `Launch-Velvet-Mines.bat` 就能立刻开始玩。
