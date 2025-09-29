import { Formik, Form } from "formik";
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
    <FormDetails texts={texts}>
      <Formik
        initialValues={initialValues}
        validationSchema={mode === "login" ? loginSchema : registerSchema}
        onSubmit={handleSubmit}
        validateOnBlur={false}
        validateOnChange={false}
      >
        {({ isSubmitting }) => (
          <Form className="space-y-6">
            {content}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-2 rounded-md text-white font-semibold transition-colors ${
                isSubmitting
                  ? "bg-primary-500 cursor-not-allowed"
                  : "bg-primary-400 hover:bg-primary-300 cursor-pointer"
              }`}
            >
              {isSubmitting
                ? mode === "register"
                  ? "Registering..."
                  : "Logging in..."
                : mode === "register"
                ? "Register"
                : "Login"}
            </button>
          </Form>
        )}
      </Formik>
    </FormDetails>
  );
}
