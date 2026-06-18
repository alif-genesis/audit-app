import { redirect } from "next/navigation";
import { BookOpenCheck } from "lucide-react";
import { hasAdminSession } from "@/app/login/actions";
import { AdminShell } from "@/components/admin-shell";
import { CustomSelect } from "@/components/custom-select";
import { createAuditTypeAction } from "../actions";

const isoOptions = [
  "COBIT 2019",
  "ISO 27001:2022",
  "ISO 20000-1:2018",
  "ISO 27701:2019",
  "ISO 27017:2015",
  "ISO 9001:2015",
  "ISO 37001:2016",
];

export default async function NewAuditTypePage() {
  const isAuthenticated = await hasAdminSession();

  if (!isAuthenticated) {
    redirect("/dashboard");
  }

  return (
    <AdminShell active="audit-types">
      <section className="page-header">
        <div>
          <div className="title-row">
            <BookOpenCheck size={30} aria-hidden="true" />
            <h1>Tambah Framework Audit</h1>
          </div>
          <p>Langkah pertama: isi detail framework audit.</p>
        </div>
      </section>

      <section className="users-panel">
        <form className="modal-form two-column-form audit-type-form" action={createAuditTypeAction}>
          <label>
            <span>Nama Framework</span>
            <input name="name" placeholder="Contoh: Audit ISO 27001" required />
          </label>
          <label>
            <span>Framework / Standar</span>
            <CustomSelect
              name="isoStandard"
              defaultValue="COBIT 2019"
              required
              options={isoOptions.map((option) => ({
                value: option,
                label: option,
              }))}
            />
          </label>
          <label className="full-field">
            <span>Deskripsi</span>
            <textarea name="description" placeholder="Deskripsi singkat framework audit" />
          </label>
          <div className="modal-actions full-field">
            <button className="primary-button modal-submit" type="submit">
              Simpan Dan Lanjut Pertanyaan
            </button>
          </div>
        </form>
      </section>
    </AdminShell>
  );
}
