import { Outlet } from "react-router-dom";
import MainNavigation from "../components/layout/MainNavigation";
import LightRays from "../../react-bits/LightRays";

export default function RootLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="fixed top-0 w-full h-full -z-10 bg-primary-900">
        <LightRays raysSpeed={1} rayLength={0.7} mouseInfluence={0.1} />
      </div>
      <MainNavigation />
      <main className="px-5 flex-1 flex">
        <Outlet />
      </main>
    </div>
  );
}
