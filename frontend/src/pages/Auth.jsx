import { useNavigate, useSearchParams } from "react-router-dom";
import NotFound from "./NotFound";
import LoginForm from "../components/forms/LoginForm";
import RegisterForm from "../components/forms/RegisterForm";
import { useMutation } from "@tanstack/react-query";
import { authenticate } from "../util/http";
import toast from "react-hot-toast";
import useCsrf from "../hooks/useCsrf";

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");
  const navigate = useNavigate();

  const { mutate } = useMutation({
    mutationFn: authenticate,
  });

  const csrfToken = useCsrf();

  if (mode !== "register" && mode !== "login") {
    return <NotFound />;
  }

  function handleSubmit(values, actions) {
    mutate(
      { mode, formData: values, csrfToken },
      {
        onSuccess: (data) => {
          actions.resetForm();
          actions.setSubmitting(false);
          toast.success(
            data.message || mode === "login"
              ? "Logged in successfully!"
              : "Registered successfully!"
          );
          navigate(mode === "login" ? "/" : "/auth?mode=login");
        },
        onError: (error) => {
          console.error(error);
          if (
            error.message.includes("already exists!") ||
            error.message.includes("valid email!")
          ) {
            actions.setFieldError("email", error.message);
          } else if (error.message.includes("3 characters long")) {
            actions.setFieldError("name", error.message);
          } else if (
            error.message.includes("8 characters long") ||
            error.message.includes(
              "at least one uppercase letter, one lowercase letter, and one number"
            )
          ) {
            actions.setFieldError("password", error.message);
          } else {
            toast.error(
              error.message ||
                (mode === "login" ? "Login failed" : "Registration failed")
            );
          }
          actions.setSubmitting(false);
        },
      }
    );
  }

  let texts, initialValues;

  if (mode === "login") {
    texts = {
      title: "Login to WebPatcher",
      subtitle: "Enter your credentials to access your account",
      link: "Don't have an account?",
      linkMode: "register",
      linkText: "Register",
    };

    initialValues = {
      email: "",
      password: "",
    };
  } else if (mode === "register") {
    texts = {
      title: "Create an Account",
      subtitle:
        "Enter your details to create an account and start using our services",
      link: "Already have an account?",
      linkMode: "login",
      linkText: "Login",
    };

    initialValues = {
      name: "",
      email: "",
      password: "",
    };
  }

  return mode === "login" ? (
    <LoginForm
      texts={texts}
      initialValues={initialValues}
      handleSubmit={handleSubmit}
    />
  ) : (
    <RegisterForm
      texts={texts}
      initialValues={initialValues}
      handleSubmit={handleSubmit}
    />
  );
}
