"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Building2, Plus, Settings, Trash2, X } from "lucide-react";
import { Toast } from "@/components/toast";
import {
  createCompanyAction,
  deleteCompanyAction,
  updateCompanyAction,
  type CompanyFormState,
} from "./actions";

type CompanyData = {
  id: string;
  name: string;
  code: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  description: string | null;
};

const initialState: CompanyFormState = {};

export function AddCompanyDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction] = useActionState(createCompanyAction, initialState);

  useEffect(() => {
    if (state.toast?.type === "success") {
      const timeout = window.setTimeout(() => setIsOpen(false), 700);
      return () => window.clearTimeout(timeout);
    }
  }, [state.toast]);

  return (
    <>
      <Toast type={state.toast?.type} message={state.toast?.message} />

      <button className="primary-button page-action" type="button" onClick={() => setIsOpen(true)}>
        <Plus size={17} aria-hidden="true" />
        Tambah Perusahaan
      </button>

      {isOpen ? (
        <CompanyModal
          title="Tambah Perusahaan"
          description="Daftarkan perusahaan sebelum membuat program audit."
          action={formAction}
          onClose={() => setIsOpen(false)}
          submitLabel="Tambah Perusahaan"
        />
      ) : null}
    </>
  );
}

export function EditCompanyDialog({ company }: { company: CompanyData }) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction] = useActionState(updateCompanyAction, initialState);

  useEffect(() => {
    if (state.toast?.type === "success") {
      const timeout = window.setTimeout(() => setIsOpen(false), 700);
      return () => window.clearTimeout(timeout);
    }
  }, [state.toast]);

  return (
    <>
      <Toast type={state.toast?.type} message={state.toast?.message} />

      <button aria-label="Edit perusahaan" type="button" onClick={() => setIsOpen(true)}>
        <Settings size={17} aria-hidden="true" />
      </button>

      {isOpen ? (
        <CompanyModal
          title="Edit Perusahaan"
          description="Perbarui detail perusahaan yang akan diaudit."
          action={formAction}
          onClose={() => setIsOpen(false)}
          submitLabel="Simpan Perusahaan"
          company={company}
        />
      ) : null}
    </>
  );
}

export function DeleteCompanyButton({
  companyId,
  companyName,
}: {
  companyId: string;
  companyName: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button aria-label="Hapus perusahaan" type="button" onClick={() => setIsOpen(true)}>
        <Trash2 size={17} aria-hidden="true" />
      </button>

      {isOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-panel confirm-panel" role="dialog" aria-modal="true">
            <button className="modal-close" type="button" aria-label="Tutup" onClick={() => setIsOpen(false)}>
              <X size={20} aria-hidden="true" />
            </button>
            <div className="modal-heading">
              <Trash2 size={28} aria-hidden="true" />
              <div>
                <h2>Hapus Perusahaan</h2>
                <p>Anda yakin ingin menghapus perusahaan {companyName}?</p>
              </div>
            </div>
            <form className="modal-actions confirm-actions" action={deleteCompanyAction}>
              <input name="id" type="hidden" value={companyId} />
              <button className="secondary-button" type="button" onClick={() => setIsOpen(false)}>
                Batal
              </button>
              <button className="danger-button" type="submit">
                Hapus Perusahaan
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function CompanyModal({
  title,
  description,
  action,
  onClose,
  submitLabel,
  company,
}: {
  title: string;
  description: string;
  action: (payload: FormData) => void;
  onClose: () => void;
  submitLabel: string;
  company?: CompanyData;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-panel wide-modal-panel" role="dialog" aria-modal="true">
        <button className="modal-close" type="button" aria-label="Tutup" onClick={onClose}>
          <X size={20} aria-hidden="true" />
        </button>

        <div className="modal-heading">
          <Building2 size={28} aria-hidden="true" />
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
        </div>

        <form className="modal-form two-column-form" action={action}>
          {company ? <input name="id" type="hidden" value={company.id} /> : null}
          <label>
            <span>Nama Perusahaan</span>
            <input name="name" defaultValue={company?.name ?? ""} placeholder="PT Contoh Perusahaan" required />
          </label>
          <label>
            <span>Kode</span>
            <input name="code" defaultValue={company?.code ?? ""} placeholder="BSSN / INTIKOM" />
          </label>
          <label>
            <span>Email</span>
            <input name="email" type="email" defaultValue={company?.email ?? ""} placeholder="kontak@company.co.id" />
          </label>
          <label>
            <span>Telepon</span>
            <input name="phone" defaultValue={company?.phone ?? ""} placeholder="+62..." />
          </label>
          <label className="full-field">
            <span>Alamat</span>
            <input name="address" defaultValue={company?.address ?? ""} placeholder="Alamat perusahaan" />
          </label>
          <label className="full-field">
            <span>Deskripsi / Ruang Lingkup</span>
            <textarea name="description" defaultValue={company?.description ?? ""} placeholder="Contoh: Pendampingan ISO 27001 dan ISO 37001 tahun 2026" />
          </label>

          <div className="modal-actions full-field">
            <button className="secondary-button" type="button" onClick={onClose}>
              Batal
            </button>
            <SubmitButton label={submitLabel} />
          </div>
        </form>
      </div>
    </div>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button className="primary-button modal-submit" type="submit" disabled={pending}>
      <Plus size={16} aria-hidden="true" />
      {pending ? "Menyimpan..." : label}
    </button>
  );
}
