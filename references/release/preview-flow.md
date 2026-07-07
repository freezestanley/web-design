# Preview Flow

预览和审计阶段以脚本为运行时真相；本文件只保留 agent 必须守住的决策规则。

## 1. Start Controlled Preview

使用：

```bash
node scripts/vitectrl/dev-preview.js start <project-path> --bypass false
```

要点：

- `--bypass false` 为必传
- 用它启动受控预览，不把普通 dev server 当最终审计环境
- 启动成功后使用返回值中的 `viteUrl`

## 2. Audit Budget

截图预算：

- 单次任务只允许 1 次截图
- 优先用于静态审计

截图前必须确认页面已经稳定可见。

## 3. Share Preview Export

无论改动大小，都必须执行：

```bash
node scripts/share-preview.js export <project-path> <task-id>
```

要点：

- 该脚本会返回 `sharePreviewUrl`
- 预览地址必须以纯文本形式发给用户
- 如果自动打开失败，也必须补发纯文本地址

## 4. User Confirmation

只有在用户明确表示“已预览且满意”后，才能继续到发布准备。

若用户只是回复“好”“继续”“确认”，但没明确说已经预览，必须追问。
