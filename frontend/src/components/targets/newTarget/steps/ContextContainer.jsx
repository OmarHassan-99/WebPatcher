import { motion as Motion } from "framer-motion";
import { X } from "lucide-react";

export default function ContextContainer({
  contextName,
  contextArr,
  contextSelectedName,
  context,
  handleSelect,
}) {
  return (
    <div>
      <p className="text-white mb-2">{contextName}</p>
      <div className="flex flex-wrap gap-2">
        {contextArr.map((ctx) => (
          <Motion.button
            type="button"
            key={ctx}
            onClick={() => handleSelect(contextSelectedName, ctx)}
            whileTap={{ scale: 0.95 }}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition cursor-pointer
                  ${
                    context.includes(ctx)
                      ? "bg-primary-400 text-white border-primary-400 shadow-md"
                      : "border-primary-600 text-primary-200 hover:border-primary-400 hover:text-primary-100"
                  }`}
          >
            {ctx}
          </Motion.button>
        ))}
      </div>

      {context.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {context.map((ctx) => (
            <Motion.div
              key={ctx}
              layout
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1 bg-primary-600/80 text-primary-100 px-3 py-1 rounded-full text-sm"
            >
              {ctx}
              <X
                size={14}
                className="cursor-pointer hover:text-primary-200"
                onClick={() => handleSelect(contextSelectedName, ctx)}
              />
            </Motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
