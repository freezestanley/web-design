# Gates

`web-design` 的流程控制以 `scripts/gate.js` 为运行时真相；本文件只保留 agent 必须知道的推进条件。

## Gate List

```text
G0_PROJECT_SELECTED
G1_TASK_CREATED
G2_PRODUCT_WRITTEN
G3_PRODUCT_CONFIRMED
G4_DESIGN_WRITTEN
G5_DESIGN_CONFIRMED
G6_DEVELOPMENT
G7_STATIC_AUDIT_PASSED
G8_PREVIEW_CONFIRMED
G9_PUBLISH_READY
DONE
```

## Mandatory Checkpoints

- `G2 -> G3`：`product.md` 已写完，`product-sync` 已执行，并且必须带用户确认原话
- `G4 -> G5`：`design.md` 已写完，并且必须带用户确认原话
- `G6 -> G7`：`audit.md` 结论必须为 `PASS`
- `G7 -> G8`：必须已完成预览地址下发
- `G8 -> G9`：用户必须明确表示已预览且满意
- `G9 -> DONE`：不能用普通 `advance`，只能执行 `publish.js`

## Reopen Rule

只要在 `G7` 及以后发生任何代码、配置、组件、脚本修改，都必须：

1. 执行 `reopen-dev`
2. 回到 `G6_DEVELOPMENT`
3. 重新走审计、预览、发布准备

不要因为改动小就跳过这次回退。

## Product Sync Rule

`product.md` 写完后，必须执行：

```bash
node scripts/product-sync.js <project-path> <task-id> [upstream-origin]
```

Agent 必须知道的要点：

- 有 API 时必须有 `upstreamOrigin`
- 多组接口对应不同上游时，必须逐组显式标记
- 未完成 `product-sync` 时，不能推进到 `G3`

## Publish Rule

发布前 agent 只需要守住两条：

- 只能通过 `node scripts/publish.js <project-path> <task-id>`
- 发布标记必须原样单独输出
