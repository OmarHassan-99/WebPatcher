import CustomInput from "../ui/CustomInput";
import FormikForm from "./FormikForm";

export default function LoginForm({ texts, initialValues, handleSubmit }) {
  const content = (
    <>
      <CustomInput
        label="Email"
        name="email"
        type="email"
        placeholder="Enter your email"
      />
      <CustomInput
        label="Password"
        name="password"
        type="password"
        placeholder="Enter your password"
      />
    </>
  );
  return (
    <FormikForm
      texts={texts}
      initialValues={initialValues}
      handleSubmit={handleSubmit}
      mode="login"
      content={content}
    />
  );
}
