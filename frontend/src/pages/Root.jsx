import { Outlet, useLoaderData, useNavigate } from "react-router-dom";
import MainNavigation from "../components/layout/MainNavigation";
import LightRays from "../react-bits/LightRays";
import Dock from "../react-bits/Dock";
import { Home, Target, User } from "lucide-react";

export default function RootLayout() {
  const session = useLoaderData();
  const { user } = session;
  const navigate = useNavigate();

  const items = [
    {
      icon: <Home size={18} color="white" />,
      label: "Home",
      onClick: () => navigate("/"),
    },
    {
      icon: <Target size={18} color="white" />,
      label: "Targets",
      onClick: () => navigate("/"),
    },
    {
      icon: <User size={18} color="white" />,
      label: "Profile",
      onClick: () => navigate("/profile"),
    },
  ];

  return (
    <div className="flex flex-col min-h-screen w-full">
      <div className="fixed top-0 w-full h-full -z-10 bg-primary-900">
        <LightRays raysSpeed={1} rayLength={0.7} mouseInfluence={0.1} />
      </div>

      <div className="fixed bottom-0 w-full z-50">
        {user && (
          <Dock
            items={items}
            panelHeight={58}
            baseItemSize={40}
            magnification={50}
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
