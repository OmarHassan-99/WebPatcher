import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { queryClient } from "./utils/http";
import { checkAuthLoader, checkSessionLoader } from "./utils/auth";
import LoadingSpinner from "./components/ui/LoadingSpinner";

import RootLayout from "./pages/Root";
import HomePage from "./pages/Home";
import AuthPage from "./pages/Auth";
import ProfilePage from "./pages/Profile";
import TargetPage from "./pages/Target";
import NewTarget from "./components/targets/newTarget/NewTarget";
import NotFoundPage from "./pages/NotFound";
import ErrorPage from "./pages/Error";

function App() {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <RootLayout />,
      hydrateFallbackElement: <LoadingSpinner />,
      errorElement: <ErrorPage />,
      id: "root",
      loader: checkSessionLoader,
      children: [
        {
          index: true,
          element: <HomePage />,
        },
        {
          path: "auth",
          element: <AuthPage />,
        },
        {
          path: "profile",
          element: <ProfilePage />,
          loader: checkAuthLoader,
        },
        {
          path: "targets",
          element: <TargetPage />,
          loader: checkAuthLoader,
        },
        {
          path: "targets/new",
          element: <NewTarget />,
          loader: checkAuthLoader,
        },
        {
          path: "*",
          element: <NotFoundPage />,
        },
      ],
    },
  ]);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster
        toastOptions={{
          style: {
            background: "#2E1A47",
            color: "#fff",
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;
