import {
  Outlet,
  useLoaderData,
  useLocation,
  useNavigate,
} from "react-router-dom";
import MainNavigation from "../components/layout/MainNavigation";
import LightRays from "../react-bits/LightRays";
import Dock from "../react-bits/Dock";
import BotPatcher from "../components/ui/BotPatcher";
import { DOCK_ITEMS } from "../data/constants";
import useGitHubToast from "../hooks/useGitHubToast";
import { lazy, Suspense, useEffect, useRef } from "react";
import { getSocket, joinUserRoom, leaveUserRoom } from "../utils/socket";
import toast from "react-hot-toast";
import { queryClient } from "../utils/http/userAuth";
import { extractIdFromSlug } from "../utils/slugify";

const AnimatedBackground = lazy(
  () => import("../components/ui/AnimatedBackground"),
);

export default function RootPage() {
  const session = useLoaderData();
  const { user } = session;
  const navigate = useNavigate();
  const location = useLocation();

  const locationRef = useRef(location.pathname);
  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  useGitHubToast();

  useEffect(() => {
    if (!user?._id) return;

    const socket = getSocket();

    function joinRoom() {
      joinUserRoom(user._id);
    }

    if (socket.connected) {
      joinRoom();
    }

    socket.on("connect", joinRoom);

    function onCreated() {
      queryClient.invalidateQueries({ queryKey: ["scans"] });
    }

    function onStatus(data) {
      queryClient.invalidateQueries({ queryKey: ["scans"] });
      queryClient.invalidateQueries({ queryKey: ["scans", data.scanJobId] });

      if (data.status === "completed") onComplete(data);
    }

    function onComplete(data) {
      const pathParts = locationRef.current.split("/");
      const currentSlug = pathParts[1] === "targets" ? pathParts[2] : null;
      const currentId = currentSlug ? extractIdFromSlug(currentSlug) : null;

      const isViewingCurrentScan =
        currentId === data.scanJobId || locationRef.current === "/targets/new";
      if (isViewingCurrentScan) return;

      toast.success(
        (t) => (
          <div
            className="flex flex-col gap-0.5 cursor-pointer group"
            onClick={() => {
              toast.dismiss(t.id);
              navigate(`/targets/${data.scanJobId}`, {
                state: { fromNotification: true },
              });
            }}
          >
            <span className="text-sm font-semibold text-slate-100">
              Scan completed successfully
            </span>
            <span className="text-xs font-medium text-emerald-400 group-hover:text-emerald-300 transition-colors duration-300">
              Click to view results &rarr;
            </span>
          </div>
        ),
        {
          duration: 8000,
          style: {
            borderRadius: "12px",
            background: "#2e1a47",
            color: "#f8fafc",
            border: "1px solid #ffffff20",
          },
          iconTheme: {
            primary: "#34d399",
            secondary: "#2e1a47",
          },
        },
      );
    }

    function onError(data) {
      toast.error(
        () => (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-slate-100">
              Scan failed
            </span>
            <span className="text-xs text-slate-400">{data.message}</span>
          </div>
        ),
        {
          duration: 8000,
          style: {
            borderRadius: "12px",
            background: "#2e1a47",
            color: "#f8fafc",
            border: "1px solid #ffffff20",
          },
          iconTheme: {
            primary: "#ef4444",
            secondary: "#2e1a47",
          },
        },
      );
    }

    socket.on("scan:created", onCreated);
    socket.on("scan:status", onStatus);
    socket.on("scan:error", onError);

    return () => {
      socket.off("connect", joinRoom);
      socket.off("scan:created", onCreated);
      socket.off("scan:status", onStatus);
      socket.off("scan:error", onError);

      leaveUserRoom(user._id);
    };
  }, [user, navigate]);

  return (
    <div className="relative w-full min-h-screen">
      <div className="fixed top-0 size-full -z-10">
        <LightRays raysOrigin="top-left" rayLength={0.7} />
      </div>
      <div className="fixed top-0 size-full -z-10">
        <LightRays raysOrigin="top-right" rayLength={0.7} />
      </div>

      <Suspense fallback={null}>
        <AnimatedBackground />
      </Suspense>

      <div className="fixed bottom-0 w-full z-50">
        <BotPatcher />
        {user && (
          <Dock
            items={DOCK_ITEMS}
            panelHeight={58}
            baseItemSize={40}
            magnification={45}
            className="bg-transparent backdrop-blur-sm"
          />
        )}
      </div>
      <main
        className={`flex flex-1 flex-col min-h-screen ${location.pathname === "/" || location.pathname === "/auth" ? "pb-0" : "pb-19"}`}
      >
        <MainNavigation />
        <Outlet />
      </main>
    </div>
  );
}
