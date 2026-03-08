import { Formik, Form } from "formik";
import { motion as Motion } from "motion/react";
import { Loader2 } from "lucide-react";
import FormDetails from "./FormDetails";
import { loginSchema, registerSchema } from "../../schemas";

export default function FormikForm({
  texts,
  initialValues,
  handleSubmit,
  mode,
  content,
}) {
  return (
    <FormDetails texts={texts} mode={mode}>
      <Formik
        initialValues={initialValues}
        validationSchema={mode === "login" ? loginSchema : registerSchema}
        onSubmit={handleSubmit}
        validateOnBlur={false}
        validateOnChange={false}
      >
        {({ isSubmitting }) => (
          <Form className="space-y-1">
            {content}
            <Motion.button
              type="submit"
              disabled={isSubmitting}
              whileHover={!isSubmitting ? { scale: 1.02 } : {}}
              whileTap={!isSubmitting ? { scale: 0.98 } : {}}
              className={`w-full py-3 mt-2 rounded-xl text-white font-semibold transition-all duration-300 flex items-center justify-center gap-2 border ${
                isSubmitting
                  ? "bg-surface-800 border-surface-700 cursor-not-allowed opacity-60"
                  : "bg-surface-800 border-surface-600 hover:bg-surface-700 hover:border-surface-500 shadow-md cursor-pointer backdrop-blur-sm"
              }`}
            >
              {isSubmitting && <Loader2 size={18} className="animate-spin" />}
              {isSubmitting
                ? mode === "register"
                  ? "Creating account..."
                  : "Signing in..."
                : mode === "register"
                  ? "Create Account"
                  : "Sign In"}
            </Motion.button>
          </Form>
        )}
      </Formik>
    </FormDetails>
  );
}
