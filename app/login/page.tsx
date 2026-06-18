import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="login-shell">
      <div className="login-panel">
        <div className="login-brand">
          <BrandMark />
          <Link className="back-link" href="/">
            <ArrowLeft size={17} aria-hidden="true" />
            Kembali
          </Link>
        </div>

        <section className="login-copy">
          <p className="eyebrow">Admin Area</p>
          <h1>Masuk Ke Aplikasi Audit</h1>
        </section>

        <LoginForm />
      </div>
    </main>
  );
}
