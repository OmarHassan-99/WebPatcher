import CustomInput from "../ui/CustomInput";
import FormikForm from "./FormikForm";

export default function RegisterForm({ texts, initialValues, handleSubmit }) {
  const content = (
    <>
      <CustomInput
        label="Name"
        name="name"
        type="text"
        placeholder="Enter your name"
      />
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
      mode="register"
      content={content}
    />
  );
}
