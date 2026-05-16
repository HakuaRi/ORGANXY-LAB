---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

# === 顶部 Hero 区域 (大标题与按钮) ===
hero:
  name: "OrganxyLab"
  text: "说点什么呗喵"
  tagline: "Navigate Thy Veritas."
  image:
    src: /logo.png    # 图片需放在 public 文件夹，或使用网络图片
    alt: Lab Logo
  actions:
    - theme: brand    # 品牌色按钮 (通常是绿色/实心)
      text: 进入笔记库
      link: /notes/
    - theme: alt      # 辅助色按钮 (通常是灰色/空心)
      text: 你在点什么呢喵？
      link: /about/

features:
  - title: 🧪 有机反应表
    details: 收录了目前简单的绝大部分有机反应喵。
    link: /notes/
    linkText: 查看列表
  - title: 🔧 工具箱
    details: 有用吗？我不知道喵。
    link: /tools/
    linkText: 查看列表
  - title: 📄 某个bot的文档
    details: 感觉随时会挂
    link: /bots/
    linkText: 查看说明
---
<div style="height: 200px; width: 100%">
</div>


<ClientOnly>
  <EventWidget />
</ClientOnly>