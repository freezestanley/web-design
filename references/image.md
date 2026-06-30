# 图片素材的使用规则

项目中对图片素材的使用规则

优先使用 Unsplash/Pexels搜索图片素材
- 图片下载到本地,放进项目 `src/assets` 文件夹
- 找不到图,使用项目下 `src/assets/default.jpg` 作为默认占位图
- 禁止直接读取图片,撑爆context
- `src/assets` 下的图片在 React/Vite 项目里必须先 import，再放进 JSX；禁止写成 `./assets/*.jpg`、`/assets/*.jpg` 这类运行时路径绕过 Vite 资源处理

在 React/JSX 中必须这样引用：
```jsx
import defaultImage from "../../assets/default.jpg";

<img src={defaultImage} alt="描述" />
```