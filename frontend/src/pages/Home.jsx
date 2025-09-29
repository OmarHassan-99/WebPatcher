import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useRouteLoaderData } from "react-router-dom";

export default function HomePage() {
  const session = useRouteLoaderData("root");
  const { success, user } = session;

  return (
    <div className="text-white text-center flex flex-col items-center justify-center flex-1">
      HomePage
      {!success && <p>Not logged in</p>}
      {user && (
        <p>
          My name is {user?.name} and my email is {user?.email}
        </p>
      )}
      <DotLottieReact
        className="h-44 w-96"
        src="https://lottie.host/bdcddda5-6470-4160-a03c-a41c705d223d/nHUeTNlfiq.lottie"
        loop
        autoplay
      />
    </div>
  );
}
