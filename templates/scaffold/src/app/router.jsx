import { createBrowserRouter, Navigate } from "react-router-dom";
import HomePage from "../pages/home";
import UnauthorizedPage from "../pages/unauthorized";
import { redirectToUnauthorized, validateSsoAccess } from "../shared/auth";

function ProtectedRoute({ children }) {
  if (!validateSsoAccess()) {
    return <Navigate to={redirectToUnauthorized()} replace />;
  }

  return children;
}

const routes = [
  {
    path: "/",
    requireAuth: true,
    element: <HomePage />
  },
  {
    path: "/unauthorized",
    element: <UnauthorizedPage />
  }
];

export const router = createBrowserRouter(
  routes.map((route) => ({
    ...route,
    element: route.requireAuth ? <ProtectedRoute>{route.element}</ProtectedRoute> : route.element
  }))
);
