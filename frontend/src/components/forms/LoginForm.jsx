import { Mail, Lock } from "lucide-react";
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
        icon={<Mail size={18} />}
      />
      <CustomInput
        label="Password"
        name="password"
        type="password"
        placeholder="Enter your password"
        icon={<Lock size={18} />}
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
