"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Settings, Trash2, X } from "lucide-react";
import type { UserRole } from "@prisma/client";
import { CustomSelect } from "@/components/custom-select";
import { Toast } from "@/components/toast";
import {
  createUserAction,
  deleteUserAction,
  updateUserAction,
  type UserFormState,
} from "./actions";

type UserData = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyName: string | null;
  isActive: boolean;
};

type CompanyOption = {
  name: string;
};

const initialState: UserFormState = {};

export function AddUserDialog({ companies }: { companies: CompanyOption[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction] = useActionState(createUserAction, initialState);

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
        Tambah User
      </button>

      {isOpen ? (
        <UserModal
          title="Tambah User"
          description="Tambahkan akun baru ke aplikasi."
          action={formAction}
          onClose={() => setIsOpen(false)}
          submitLabel="Tambah User"
          companies={companies}
        />
      ) : null}
    </>
  );
}

export function EditUserDialog({
  companies,
  user,
}: {
  companies: CompanyOption[];
  user: UserData;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction] = useActionState(updateUserAction, initialState);

  useEffect(() => {
    if (state.toast?.type === "success") {
      const timeout = window.setTimeout(() => setIsOpen(false), 700);
      return () => window.clearTimeout(timeout);
    }
  }, [state.toast]);

  return (
    <>
      <Toast type={state.toast?.type} message={state.toast?.message} />

      <button aria-label="Edit user" type="button" onClick={() => setIsOpen(true)}>
        <Settings size={17} aria-hidden="true" />
      </button>

      {isOpen ? (
        <UserModal
          title="Edit User"
          description="Perbarui detail akun user."
          action={formAction}
          onClose={() => setIsOpen(false)}
          submitLabel="Simpan User"
          companies={companies}
          user={user}
        />
      ) : null}
    </>
  );
}

export function DeleteUserButton({
  userId,
  userName,
  userRole,
}: {
  userId: string;
  userName: string;
  userRole: UserRole;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (userRole === "ADMIN") {
    return (
      <button aria-label="Admin tidak bisa dihapus" disabled title="Admin tidak bisa dihapus" type="button">
        <Trash2 size={17} aria-hidden="true" />
      </button>
    );
  }

  return (
    <>
      <button aria-label="Hapus user" type="button" onClick={() => setIsOpen(true)}>
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
                <h2>Hapus User</h2>
                <p>Anda yakin ingin menghapus user {userName}?</p>
              </div>
            </div>
            <form className="modal-actions confirm-actions" action={deleteUserAction}>
              <input name="id" type="hidden" value={userId} />
              <button className="secondary-button" type="button" onClick={() => setIsOpen(false)}>
                Batal
              </button>
              <button className="danger-button" type="submit">
                Hapus User
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function UserModal({
  title,
  description,
  action,
  onClose,
  submitLabel,
  companies,
  user,
}: {
  title: string;
  description: string;
  action: (payload: FormData) => void;
  onClose: () => void;
  submitLabel: string;
  companies: CompanyOption[];
  user?: UserData;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-panel" role="dialog" aria-modal="true">
        <button className="modal-close" type="button" aria-label="Tutup" onClick={onClose}>
          <X size={20} aria-hidden="true" />
        </button>

        <div className="modal-heading">
          <Settings size={28} aria-hidden="true" />
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
        </div>

        <form className="modal-form" action={action}>
          {user ? <input name="id" type="hidden" value={user.id} /> : null}
          <label>
            <span>Nama Lengkap</span>
            <input name="name" defaultValue={user?.name ?? ""} placeholder="Masukkan nama" required />
          </label>
          <label>
            <span>Email</span>
            <input
              name="email"
              type="email"
              defaultValue={user?.email ?? ""}
              placeholder="user@company.co.id"
              required
            />
          </label>
          {!user ? (
            <label>
              <span>Password</span>
              <input name="password" type="password" placeholder="Minimal 6 karakter" required />
            </label>
          ) : null}
          <label>
            <span>Role</span>
            <CustomSelect
              name="role"
              defaultValue={user?.role ?? "AUDITEE"}
              required
              options={[
                { value: "ADMIN", label: "Admin" },
                { value: "AUDITEE", label: "Auditee" },
                { value: "AUDITOR", label: "Auditor" },
              ]}
            />
          </label>
          <label>
            <span>Perusahaan</span>
            <CustomSelect
              name="companyName"
              defaultValue={user?.companyName ?? ""}
              options={[
                { value: "", label: "Tanpa Perusahaan" },
                ...companies.map((company) => ({
                  value: company.name,
                  label: company.name,
                })),
              ]}
            />
          </label>
          <label>
            <span>Status</span>
            <CustomSelect
              name="isActive"
              defaultValue={String(user?.isActive ?? true)}
              disabled={user?.role === "ADMIN"}
              options={[
                { value: "true", label: "Aktif" },
                { value: "false", label: "Nonaktif", disabled: user?.role === "ADMIN" },
              ]}
            />
          </label>

          <div className="modal-actions">
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
