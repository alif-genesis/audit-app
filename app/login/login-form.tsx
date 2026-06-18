"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Lock, LogIn, Mail } from "lucide-react";
import { Toast } from "@/components/toast";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form className="login-form" action={formAction}>
      <label>
        <span>Email</span>
        <div className="input-wrap">
          <Mail size={18} aria-hidden="true" />
          <input
            name="email"
            type="email"
            placeholder="Masukkan email"
            autoComplete="email"
            required
          />
        </div>
      </label>

      <label>
        <span>Password</span>
        <div className="input-wrap">
          <Lock size={18} aria-hidden="true" />
          <input
            name="password"
            type="password"
            placeholder="Masukkan password"
            autoComplete="current-password"
            required
          />
        </div>
      </label>

      <Toast type="error" message={state.error} />

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="primary-button login-button" type="submit" disabled={pending}>
      <LogIn size={18} aria-hidden="true" />
      {pending ? "Memproses..." : "Masuk Dashboard"}
    </button>
  );
}
