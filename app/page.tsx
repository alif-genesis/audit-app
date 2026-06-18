import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

export default function Home() {
  return (
    <main className="landing-shell">
      <div className="landing-inner">
        <BrandMark />

        <section className="landing-copy" aria-labelledby="landing-title">
          <p className="eyebrow">Audit Management Platform</p>
          <h1 id="landing-title">
            Selamat Datang Di Aplikasi Audit PT. Genetika Solusi Bisnis
          </h1>
          <p className="landing-description">
            Platform Audit, Assessment, dan Governance untuk ISO, COBIT, dan
            Framework Tata Kelola Lainnya.
          </p>
          <Link className="primary-button" href="/login">
            Login Admin
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </section>
        <footer className="landing-footer">© 2026 PT. Genetika Solusi Bisnis</footer>
      </div>
    </main>
  );
}
