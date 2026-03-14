import { useState } from "react";
import { motion as Motion } from "framer-motion";
import {
  DATABASES,
  LANGUAGES,
  FRAMEWORKS,
  OPERATING_SYSTEMS,
  SCMs,
  WEB_SERVERS,
} from "../../../../data/constants";
import ContextContainer from "./ContextContainer";

export default function AIContext({ formData, updateAiContext }) {
  const [selectedDB, setSelectedDB] = useState(formData.context.db);
  const [selectedLangs, setSelectedLangs] = useState(formData.context.lang);
  const [selectedFrameworks, setSelectedFrameworks] = useState(
    formData.context.fw,
  );
  const [selectedOS, setSelectedOS] = useState(formData.context.os);
  const [selectedSCM, setSelectedSCM] = useState(formData.context.scm);
  const [selectedWS, setSelectedWS] = useState(formData.context.ws);

  function handleSelect(type, value) {
    updateAiContext(type, value);
    const setFn =
      type === "db"
        ? setSelectedDB
        : type === "lang"
          ? setSelectedLangs
          : type === "fw"
            ? setSelectedFrameworks
            : type === "os"
              ? setSelectedOS
              : type === "scm"
                ? setSelectedSCM
                : setSelectedWS;
    const current =
      type === "db"
        ? selectedDB
        : type === "lang"
          ? selectedLangs
          : type === "fw"
            ? selectedFrameworks
            : type === "os"
              ? selectedOS
              : type === "scm"
                ? selectedSCM
                : selectedWS;

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
      <h2 className="text-3xl font-bold text-white mb-3 tracking-tight text-center">
        Select Target Context
      </h2>

      <p className="text-primary-100 text-sm max-w-lg mx-auto leading-relaxed text-center mb-8">
        <span className="font-medium">Optional</span> — helps WebPatcher AI
        generate more accurate patch recommendations.
      </p>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-6">
          {/* Databases */}
          <ContextContainer
            contextName="Databases"
            contextArr={DATABASES}
            contextSelectedName="db"
            context={selectedDB}
            handleSelect={handleSelect}
          />
          {/* Languages */}
          <ContextContainer
            contextName="Programming Languages"
            contextArr={LANGUAGES}
            contextSelectedName="lang"
            context={selectedLangs}
            handleSelect={handleSelect}
          />
          {/* Frameworks */}
          <ContextContainer
            contextName="Web Frameworks"
            contextArr={FRAMEWORKS}
            contextSelectedName="fw"
            context={selectedFrameworks}
            handleSelect={handleSelect}
          />
        </div>

        <div className="flex-1 space-y-6">
          {/* OS */}
          <ContextContainer
            contextName="Operating Systems"
            contextArr={OPERATING_SYSTEMS}
            contextSelectedName="os"
            context={selectedOS}
            handleSelect={handleSelect}
          />
          {/* SCM */}
          <ContextContainer
            contextName="Source Control Management"
            contextArr={SCMs}
            contextSelectedName="scm"
            context={selectedSCM}
            handleSelect={handleSelect}
          />
          {/* Web Servers */}
          <ContextContainer
            contextName="Web Servers"
            contextArr={WEB_SERVERS}
            contextSelectedName="ws"
            context={selectedWS}
            handleSelect={handleSelect}
          />
        </div>
      </div>
    </Motion.div>
  );
}
