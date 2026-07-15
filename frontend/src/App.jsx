import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { queryClient } from "./utils/http/userAuth";
import { checkAuthLoader, checkSessionLoader } from "./utils/checkAuth";
import Loading from "./components/ui/Loading";

import RootPage from "./pages/Root";
import HomePage from "./pages/Home";
import AuthPage from "./pages/Auth";
import ProfilePage from "./pages/Profile";
import TargetsPage from "./pages/Targets";
import NewTargetPage from "./pages/NewTarget";
import NotFoundPage from "./pages/NotFound";
import ErrorPage from "./pages/Error";
import TargetDetailsPage from "./pages/TargetDetails";
import InfoPage from "./pages/Info";

function App() {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <RootPage />,
      hydrateFallbackElement: <Loading />,
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
          path: "info",
          element: <InfoPage />,
        },
        {
          path: "targets",
          element: <TargetsPage />,
          loader: checkAuthLoader,
        },
        {
          path: "targets/new",
          element: <NewTargetPage />,
          loader: checkAuthLoader,
        },
        {
          path: "targets/:slug",
          element: <TargetDetailsPage />,
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
          position: "top-right",
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
