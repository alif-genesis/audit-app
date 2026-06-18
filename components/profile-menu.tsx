"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { KeyRound, Settings, UserRound, X } from "lucide-react";
import {
  changePasswordAction,
  updateProfileAction,
  type ProfileState,
} from "@/app/profile/actions";
import { Toast } from "@/components/toast";

type ProfileMenuProps = {
  user: {
    name: string;
    email: string;
    companyName: string | null;
  };
};

const initialState: ProfileState = {};

export function ProfileMenu({ user }: ProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [profileState, profileAction] = useActionState(
    updateProfileAction,
    initialState,
  );
  const [passwordState, passwordAction] = useActionState(
    changePasswordAction,
    initialState,
  );
  const toast = profileState.toast ?? passwordState.toast;

  useEffect(() => {
    if (toast?.type === "success") {
      const timeout = window.setTimeout(() => setIsOpen(false), 700);
      return () => window.clearTimeout(timeout);
    }
  }, [toast]);

  return (
    <>
      <Toast type={toast?.type} message={toast?.message} />

      <button className="profile-trigger" type="button" onClick={() => setIsOpen(true)}>
        <span>{getInitials(user.name)}</span>
        <strong>{user.name}</strong>
      </button>

      {isOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-panel profile-panel" role="dialog" aria-modal="true">
            <button
              className="modal-close"
              type="button"
              aria-label="Tutup"
              onClick={() => setIsOpen(false)}
            >
              <X size={20} aria-hidden="true" />
            </button>

            <div className="modal-heading">
              <UserRound size={28} aria-hidden="true" />
              <div>
                <h2 style={{ fontSize: "28px", fontWeight: 900, margin: "0", color: "#1c1c1c", lineHeight: "1.1" }}>Profil Saya</h2>
                <p>Perbarui detail akun dan password Anda.</p>
              </div>
            </div>

            <form className="modal-form" action={profileAction}>
              <label>
                <span>Nama</span>
                <input name="name" defaultValue={user.name} required />
              </label>
              <label>
                <span>Email</span>
                <input name="email" type="email" defaultValue={user.email} required />
              </label>
              <label>
                <span>Perusahaan</span>
                <input name="companyName" defaultValue={user.companyName ?? ""} />
              </label>
              <SubmitButton icon="settings" label="Simpan Profil" pendingLabel="Menyimpan..." />
            </form>

            <form className="modal-form password-form" action={passwordAction}>
              <h3>Ganti Password</h3>
              <label>
                <span>Password Lama</span>
                <input name="oldPassword" type="password" required />
              </label>
              <label>
                <span>Password Baru</span>
                <input name="newPassword" type="password" required />
              </label>
              <SubmitButton icon="key" label="Ganti Password" pendingLabel="Memproses..." />
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SubmitButton({
  icon,
  label,
  pendingLabel,
}: {
  icon: "settings" | "key";
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  const Icon = icon === "key" ? KeyRound : Settings;

  return (
    <button className="primary-button modal-submit" type="submit" disabled={pending}>
      <Icon size={16} aria-hidden="true" />
      {pending ? pendingLabel : label}
    </button>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
