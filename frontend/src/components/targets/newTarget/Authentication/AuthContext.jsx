import { useState } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { testAuth } from "../../../../utils/http/zap";
import useCsrf from "../../../../hooks/useCsrf";
import AuthHeader from "./AuthHeader";
import AuthToggle from "./AuthToggle";
import AuthForm from "./AuthForm";
import AuthTest from "./AuthTest";

export default function AuthConfig({ formData, updateAuthConfig, targetUrl }) {
  const csrfToken = useCsrf();
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const { mutate: testMutate, isPending: isTesting } = useMutation({
    mutationFn: testAuth,
    onSuccess: (data) => setTestResult(data),
    onError: (err) => setTestResult({ success: false, message: err.message }),
  });

  const auth = formData.authConfig;
  const isEnabled = auth.enabled;

  function update(field, value) {
    updateAuthConfig(field, value);
    setTestResult(null); // Reset test result on any change
  }

  function handleTestAuth() {
    setTestResult(null);
    testMutate({
      csrfToken,
      targetUrl,
      authConfig: auth,
    });
  }

  const canTest =
    isEnabled &&
    auth.loginUrl?.trim() &&
    auth.username?.trim() &&
    auth.password?.trim();

  return (
    <div className="px-8 pb-12">
      <AuthHeader />

      <AuthToggle
        isEnabled={isEnabled}
        onToggle={() => update("enabled", !isEnabled)}
      />

      <AnimatePresence mode="popLayout">
        {isEnabled && (
          <Motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: "spring" }}
          >
            <AuthForm
              auth={auth}
              update={update}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              AuthTestComponent={
                <AuthTest
                  onTest={handleTestAuth}
                  canTest={canTest}
                  isTesting={isTesting}
                  testResult={testResult}
                />
              }
            />
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
