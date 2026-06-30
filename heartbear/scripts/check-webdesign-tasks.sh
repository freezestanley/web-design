#!/bin/bash
# 检查 web-design 任务状态，输出未完成的任务列表

PROJECTS_DIR="${PROJECTS_DIR:-/home/ubuntu/claw-workspace/projects}"
WEBDESIGN_DIR="${WEBDESIGN_DIR:-/home/ubuntu/claw-workspace/.agents/skills/web-design}"

if [ ! -d "$PROJECTS_DIR" ]; then
  echo "[]"
  exit 0
fi

# 遍历所有项目
find "$PROJECTS_DIR" -maxdepth 2 -name ".webdesign" -type d | while read webdesign_dir; do
  project_dir=$(dirname "$webdesign_dir")
  project_name=$(basename "$project_dir")

  # 遍历所有任务
  find "$webdesign_dir/tasks" -maxdepth 2 -name "workflow.json" | while read workflow_file; do
    task_dir=$(dirname "$workflow_file")
    task_id=$(basename "$task_dir")

    # 读取 gate 状态
    current_gate=$(cat "$workflow_file" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('currentGate','UNKNOWN'))" 2>/dev/null || echo "UNKNOWN")

    if [ "$current_gate" != "DONE" ] && [ "$current_gate" != "UNKNOWN" ]; then
      echo "{\"project\":\"$project_name\",\"taskId\":\"$task_id\",\"gate\":\"$current_gate\",\"path\":\"$project_dir\",\"blocked\":$(cat "$workflow_file" | python3 -c "import sys,json; d=json.load(sys.stdin); print('true' if d.get('blocked') else 'false')" 2>/dev/null || echo 'false')}"
    fi
  done
done
