## 安装前置


- **重要** 所有安装都在当前workspace
- 安装流程: 如解析失败请手动安装依赖技能
  - `npx skills add https://github.com/greensock/gsap-skills`
  - `npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"`
  - `npx skills add anthropics/skills --skill frontend-design`
  - `npx skills add ofershap/tailwind-best-practices`
  - 修改config.js中`PROJECTS_DIR`改为当前 agent workspace的绝对路径下projects文件夹,如`/home/ubuntu/claw-workspace/projects`
  - 拷贝`heartbear/scripts`下的文件到当前workspace下的`scripts`目录下
  - 将`HEARTBEAT.md`追加到当前workspace下的`HEARTBEAT.md`内
  - 将context管理规则追加到当前workspace下的`AGENTS.md`内 
    context管理规则: `references/context.md`,防止上下文爆炸,直接卡死上下文
  - 执行先执行 HANDOFF 保存状态，然后 /compact释放上下文
  - 执行`gateway restart`重启gateway,使配置生效