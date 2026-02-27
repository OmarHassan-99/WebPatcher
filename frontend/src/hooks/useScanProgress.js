import { useEffect, useRef, useState } from "react";
import { getSocket, joinScanRoom, leaveScanRoom } from "../utils/socket";

export function useScanProgress(scanJobId, initialStatus = "queued") {
  const isAlreadyCompleted = initialStatus === "completed";

  const [state, setState] = useState({
    stage: isAlreadyCompleted
      ? "done"
      : initialStatus === "running"
        ? "spider"
        : initialStatus,
    percent: isAlreadyCompleted ? 100 : null,
    message: isAlreadyCompleted
      ? "Scan complete"
      : initialStatus === "queued"
        ? "Waiting to start..."
        : "Syncing live progress...",
    patches: [],
    patchTotal: 0,
    isDone: isAlreadyCompleted,
    isError: initialStatus === "failed",
    errorMessage: "",
  });

  const patchesRef = useRef([]);

  useEffect(() => {
    if (!scanJobId || scanJobId === "pending") return;

    patchesRef.current = [];
    const socket = getSocket();

    function join() {
      joinScanRoom(scanJobId);
    }

    join();
    socket.on("connect", join);

    function onStage({ stage, message, total }) {
      setState((prev) => ({
        ...prev,
        stage,
        message: message || prev.message,
        percent: null,
        patchTotal: total ?? prev.patchTotal,
        isDone: false,
        isError: false,
      }));
    }

    function onProgress({ stage, percent, message }) {
      setState((prev) => ({
        ...prev,
        stage,
        percent: percent ?? prev.percent,
        message: message || prev.message,
        isDone: false,
        isError: false,
      }));
    }

    function onPatch({ index, total, alert_name, risk_level, success, error }) {
      const patch = { index, total, alert_name, risk_level, success, error };
      patchesRef.current = [...patchesRef.current, patch];
      setState((prev) => ({
        ...prev,
        stage: "patching",
        patches: patchesRef.current,
        patchTotal: total,
        message: `AI patching… (${index}/${total})`,
      }));
    }

    function onComplete({ successCount, total, message }) {
      setState((prev) => ({
        ...prev,
        stage: "done",
        percent: 100,
        message:
          message ||
          `Scan complete — ${successCount}/${total} patches generated`,
        isDone: true,
        isError: false,
      }));
    }

    function onError({ message }) {
      setState((prev) => ({
        ...prev,
        isError: true,
        errorMessage: message || "An error occurred",
        isDone: false,
      }));
    }

    socket.on("scan:stage", onStage);
    socket.on("scan:progress", onProgress);
    socket.on("scan:patch", onPatch);
    socket.on("scan:complete", onComplete);
    socket.on("scan:error", onError);

    return () => {
      socket.off("connect", join);
      socket.off("scan:stage", onStage);
      socket.off("scan:progress", onProgress);
      socket.off("scan:patch", onPatch);
      socket.off("scan:complete", onComplete);
      socket.off("scan:error", onError);
      leaveScanRoom(scanJobId);
    };
  }, [scanJobId]);

  return state;
}
