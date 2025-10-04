import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { queryClient } from "./utils/http";
import { checkSessionLoader } from "./utils/auth";
import LoadingSpinner from "./components/ui/LoadingSpinner";

import HomePage from "./pages/Home";
import RootLayout from "./pages/Root";
import NotFoundPage from "./pages/NotFound";
import AuthPage from "./pages/Auth";
import Profile from "./pages/Profile";

function App() {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <RootLayout />,
      hydrateFallbackElement: (
        <div className="bg-primary-900 min-h-screen">
          <LoadingSpinner />
        </div>
      ),
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
          element: <Profile />,
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
