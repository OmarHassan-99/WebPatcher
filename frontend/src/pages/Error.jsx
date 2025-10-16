export default function ErrorPage() {
  return (
    <div className="flex flex-col w-full min-h-screen items-center justify-center text-center text-primary-300 bg-primary-900">
      <h1 className="text-7xl font-bold mb-4">500</h1>
      <p className="text-2xl">Internal Server Error</p>
      <p className="text-2xl">
        Please try again later or{" "}
        <span
          className="underline cursor-pointer"
          onClick={() => window.location.reload()}
        >
          Reload
        </span>{" "}
        the page
      </p>
    </div>
  );
}
