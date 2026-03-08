export default function InstanceRow({ instance }) {
  return (
    <div className="text-sm grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 p-2 bg-gray-900/50 rounded">
      <span className="text-gray-400 font-mono text-xs uppercase self-center border border-gray-600 px-1 rounded">
        {instance.method}
      </span>
      <a
        href={instance.uri}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 hover:text-blue-300 hover:underline truncate"
        title={instance.uri}
      >
        {instance.uri}
      </a>
      {instance.param && (
        <div className="col-span-2 text-xs text-gray-500 pl-1">
          Parameter:{" "}
          <span className="text-red-400 font-mono">{instance.param}</span>
        </div>
      )}
    </div>
  );
}
