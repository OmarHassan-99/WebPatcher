import { Outlet, useLoaderData } from "react-router-dom";
import MainNavigation from "../components/layout/MainNavigation";
import LightRays from "../react-bits/LightRays";
import Dock from "../react-bits/Dock";
import { dockItems } from "../data/constants";
import useGitHubToast from "../hooks/useGitHubToast";

export default function RootLayout() {
  const session = useLoaderData();
  const { user } = session;

  useGitHubToast();

  return (
    <div className="flex flex-col min-h-screen w-full">
      <div className="fixed top-0 w-full h-full -z-10 bg-primary-900">
        <LightRays raysSpeed={1} rayLength={0.7} mouseInfluence={0.1} />
      </div>

      <div className="fixed bottom-0 w-full z-50">
        {user && (
          <Dock
            items={dockItems}
            panelHeight={58}
            baseItemSize={40}
            magnification={45}
            className="bg-transparent backdrop-blur-sm"
          />
        )}
      </div>
      <MainNavigation />
      <main className="flex mt-6 w-full">
        <div className="flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
