import { useRouteLoaderData } from "react-router-dom";
import WhatWeOffer from "../components/sections/WhatWeOffer";
import Footer from "../components/sections/Footer";
import { useMutation } from "@tanstack/react-query";
import { startZapScan } from "../utils/http";
import useCsrf from "../hooks/useCsrf";

export default function HomePage() {
  const session = useRouteLoaderData("root");
  const { success, user } = session;

  const { mutate } = useMutation({ mutationFn: startZapScan });

  const csrfToken = useCsrf();

  function handleStartScan() {
    console.log("starting scan");
    mutate(
      { csrfToken, url: "http://testphp.vulnweb.com/" },
      { onSuccess: (data) => console.log(data) }
    );
  }

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center text-white text-center">
      HomePage
      <button
        onClick={handleStartScan}
        className="bg-primary-400 rounded-md cursor-pointer"
      >
        start scan
      </button>
      {!success && <p>Not logged in</p>}
      {user && (
        <p>
          My name is {user?.name} and my email is {user?.email}
        </p>
      )}
      <WhatWeOffer />
      <Footer />
    </div>
  );
}
