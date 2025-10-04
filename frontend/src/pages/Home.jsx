import { useRouteLoaderData } from "react-router-dom";
import WhatWeOffer from "../components/sections/WhatWeOffer";

export default function HomePage() {
  const session = useRouteLoaderData("root");
  const { success, user } = session;

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center text-white text-center">
      HomePage
      {!success && <p>Not logged in</p>}
      {user && (
        <p>
          My name is {user?.name} and my email is {user?.email}
        </p>
      )}
      <WhatWeOffer />
    </div>
  );
}
