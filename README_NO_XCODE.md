# AI Pulse 2025: 无需 Xcode 的桌面小组件方案

如果你不想使用复杂的 Xcode 编译流程，以下是两种最推荐的替代方案，都能实现“网页转桌面小组件”的效果。

---

## 方案 A：使用 Übersicht (推荐，极客感最强)
**效果**：直接嵌入到你的桌面壁纸层，支持透明背景，性能极高。

### 使用步骤：
1. **安装 Übersicht**：前往 [tracesof.net/uebersicht](https://tracesof.net/uebersicht/) 下载并安装。
2. **放置脚本**：将本项目根目录下的 `ai-pulse.jsx` 文件移动到 `~/Library/Application Support/Uebersicht/widgets/` 文件夹中。
3. **查看效果**：Übersicht 会自动加载该文件，你现在应该能在桌面上看到流光溢彩的 AI 动态列表了。

---

## 方案 B：使用 Glance App (支持系统原生“小组件库”菜单)
**效果**：完美满足你“从桌面菜单选择添加”的需求。它是一个外壳应用，能将网页放入系统原生的 Widget Gallery。

### 使用步骤：
1. **安装 Glance**：在 Mac App Store 搜索 **"Glance - Web Widgets"** 或前往其 [官网](https://glancefeeds.com/)。
2. **打开小组件库**：右键桌面 -> **“编辑小组件”**。
3. **添加 Glance**：在库中找到 **Glance**，将其拖入桌面。
4. **配置地址**：点击桌面上已添加的 Glance 小组件（进入编辑模式），在 URL 栏输入：
   `file:///Users/yangjiawen/Desktop/ai-pulse-2025/index.html?mode=widget`
5. **完成**：现在的网页就直接运行在系统原生的菜单框架内了。

---

## 总结
- 如果你追求**绝对的视觉美感**和壁纸融合度，请选 **Übersicht**。
- 如果你追求**系统菜单集成**和原生管理方式，请选 **Glance**。
