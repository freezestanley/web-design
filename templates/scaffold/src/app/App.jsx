import { useMemo } from "react";
import { RouterProvider } from "react-router-dom";
import { createRouter } from "./router";

export default function App() {
  // createRouter 在组件首次渲染时执行（bundle 已加载，window.__BASENAME__ 已注入）
  // useMemo 确保整个应用生命周期内只创建一次 router 实例
  const router = useMemo(() => createRouter(), []);
  return <RouterProvider router={router} />;
}
