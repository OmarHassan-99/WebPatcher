import { useState } from "react";
import { motion as Motion } from "framer-motion";
import { X } from "lucide-react";
import { FRAMEWORKS, LANGUAGES } from "../../../../data/constants";

export default function AIContext({ formData, updateAiContext }) {
  const [selectedLangs, setSelectedLangs] = useState(formData.context.lang);
  const [selectedFrameworks, setSelectedFrameworks] = useState(
    formData.context.fw
  );

  function handleSelect(type, value) {
    updateAiContext(type, value);
    const setFn = type === "lang" ? setSelectedLangs : setSelectedFrameworks;
    const current = type === "lang" ? selectedLangs : selectedFrameworks;

    if (current.includes(value)) {
      setFn(current.filter((item) => item !== value));
    } else {
      setFn([...current, value]);
    }
  }

  return (
    <Motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", duration: 0.6 }}
      className="px-8 pb-12"
    >
      <h2 className="text-2xl font-semibold text-primary-100 mb-6 text-center">
        Select Target Context
      </h2>

      <p className="text-primary-300 text-sm text-center mb-8">
        <span className="text-primary-200 font-medium">Optional</span> — helps
        WebPatcher AI generate more accurate patch recommendations.
      </p>

      <div className="flex space-x-8">
        {/* Languages */}
        <div>
          <p className="text-primary-200 mb-2">Programming Languages</p>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((lang) => (
              <Motion.button
                type="button"
                key={lang}
                onClick={() => handleSelect("lang", lang)}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition cursor-pointer
                  ${
                    selectedLangs.includes(lang)
                      ? "bg-primary-400 text-white border-primary-400 shadow-md"
                      : "border-primary-600 text-primary-200 hover:border-primary-400 hover:text-primary-100"
                  }`}
              >
                {lang}
              </Motion.button>
            ))}
          </div>

          {selectedLangs.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {selectedLangs.map((lang) => (
                <Motion.div
                  key={lang}
                  layout
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1 bg-primary-600/80 text-primary-100 px-3 py-1 rounded-full text-sm"
                >
                  {lang}
                  <X
                    size={14}
                    className="cursor-pointer hover:text-primary-200"
                    onClick={() => handleSelect("lang", lang)}
                  />
                </Motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Frameworks */}
        <div>
          <p className="text-primary-200 mb-2">Web Frameworks</p>
          <div className="flex flex-wrap gap-2">
            {FRAMEWORKS.map((fw) => (
              <Motion.button
                type="button"
                key={fw}
                onClick={() => handleSelect("fw", fw)}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition cursor-pointer
                  ${
                    selectedFrameworks.includes(fw)
                      ? "bg-primary-400 text-white border-primary-400 shadow-md"
                      : "border-primary-600 text-primary-200 hover:border-primary-400 hover:text-primary-100"
                  }`}
              >
                {fw}
              </Motion.button>
            ))}
          </div>

          {selectedFrameworks.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {selectedFrameworks.map((fw) => (
                <Motion.div
                  key={fw}
                  layout
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1 bg-primary-600/80 text-primary-100 px-3 py-1 rounded-full text-sm"
                >
                  {fw}
                  <X
                    size={14}
                    className="cursor-pointer hover:text-primary-200"
                    onClick={() => handleSelect("fw", fw)}
                  />
                </Motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Motion.div>
  );
}
