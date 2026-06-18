"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Plus, Settings, Trash2, X } from "lucide-react";
import { CustomSelect } from "@/components/custom-select";
import { Toast } from "@/components/toast";
import { useEscapeClose } from "@/components/use-escape-close";
import {
  createDesignFactorAssessmentAction,
  deleteDesignFactorAssessmentAction,
  updateDesignFactorAssessmentAction,
  type DesignFactorFormState,
} from "./actions";

type UserData = {
  id: string;
  name: string;
  email: string;
  role: string;
  companyName: string | null;
};

type AssessmentData = {
  id: string;
  name: string;
  companyName: string;
  auditorId: string;
  auditeeId: string;
  targetScore: number | null;
  startDate: Date;
  dueDate: Date | null;
  description: string | null;
  status: string;
};

const initialState: DesignFactorFormState = {};

export function AddDesignFactorDialog({
  companies,
  users,
}: {
  companies: Array<{ name: string }>;
  users: UserData[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction] = useActionState(createDesignFactorAssessmentAction, initialState);
  useEscapeClose(() => setIsOpen(false), isOpen);

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
        Buat Design Factor
      </button>

      {isOpen ? (
        <DesignFactorModal
          title="Buat Assessment Design Factor"
          description="Buat assessment COBIT 2019 dan assign auditor serta auditee."
          action={formAction}
          onClose={() => setIsOpen(false)}
          submitLabel="Buat Assessment"
          companies={companies}
          users={users}
        />
      ) : null}
    </>
  );
}

export function EditDesignFactorDialog({
  assessment,
  users,
}: {
  assessment: AssessmentData;
  users: UserData[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction] = useActionState(updateDesignFactorAssessmentAction, initialState);
  useEscapeClose(() => setIsOpen(false), isOpen);

  useEffect(() => {
    if (state.toast?.type === "success") {
      const timeout = window.setTimeout(() => setIsOpen(false), 700);
      return () => window.clearTimeout(timeout);
    }
  }, [state.toast]);

  return (
    <>
      <Toast type={state.toast?.type} message={state.toast?.message} />
      <button aria-label="Edit assessment" type="button" onClick={() => setIsOpen(true)}>
        <Settings size={17} aria-hidden="true" />
      </button>

      {isOpen ? (
        <DesignFactorModal
          title="Edit Assessment Design Factor"
          description="Perbarui metadata dan assignment assessment."
          action={formAction}
          onClose={() => setIsOpen(false)}
          submitLabel="Simpan Assessment"
          assessment={assessment}
          users={users}
        />
      ) : null}
    </>
  );
}

export function DeleteDesignFactorButton({
  assessmentId,
  assessmentName,
}: {
  assessmentId: string;
  assessmentName: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  useEscapeClose(() => setIsOpen(false), isOpen);

  return (
    <>
      <button aria-label="Hapus assessment" type="button" onClick={() => setIsOpen(true)}>
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
                <h2>Hapus Assessment</h2>
                <p>Anda yakin ingin menghapus "{assessmentName}"?</p>
              </div>
            </div>
            <form className="modal-actions confirm-actions" action={deleteDesignFactorAssessmentAction}>
              <input name="id" type="hidden" value={assessmentId} />
              <button className="secondary-button" type="button" onClick={() => setIsOpen(false)}>
                Batal
              </button>
              <button className="danger-button" type="submit">
                Hapus
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function DesignFactorModal({
  title,
  description,
  action,
  onClose,
  submitLabel,
  companies,
  users,
  assessment,
}: {
  title: string;
  description: string;
  action: (payload: FormData) => void;
  onClose: () => void;
  submitLabel: string;
  companies?: Array<{ name: string }>;
  users: UserData[];
  assessment?: AssessmentData;
}) {
  const [formError, setFormError] = useState("");
  useEscapeClose(onClose);
  const [selectedCompany, setSelectedCompany] = useState(assessment?.companyName ?? "");
  const auditors = users.filter((user) => user.role === "AUDITOR");
  const auditees = users.filter((user) => user.role === "AUDITEE");
  const filteredAuditors = selectedCompany
    ? auditors.filter((auditor) => auditor.companyName === selectedCompany)
    : auditors;
  const filteredAuditees = selectedCompany
    ? auditees.filter((auditee) => auditee.companyName === selectedCompany)
    : auditees;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    setFormError("");
    const formData = new FormData(event.currentTarget);
    const required = ["name", "auditorId", "auditeeId", "startDate"];
    const missing = required.some((field) => !String(formData.get(field) || "").trim());

    if ((!assessment && !String(formData.get("companyName") || "").trim()) || missing) {
      event.preventDefault();
      setFormError("Data wajib belum lengkap.");
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-panel wide-modal-panel" role="dialog" aria-modal="true">
        <button className="modal-close" type="button" aria-label="Tutup" onClick={onClose}>
          <X size={20} aria-hidden="true" />
        </button>

        <div className="modal-heading">
          <CheckCircle2 size={28} aria-hidden="true" />
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
        </div>

        {formError ? <div className="form-error">{formError}</div> : null}

        <form className="modal-form two-column-form" action={action} onSubmit={handleSubmit}>
          {assessment ? <input name="id" type="hidden" value={assessment.id} /> : null}

          <label>
            <span>Assessment Name</span>
            <input name="name" defaultValue={assessment?.name ?? ""} placeholder="Contoh: COBIT DF 2026" required />
          </label>

          {!assessment ? (
            <label>
              <span>Company</span>
              <CustomSelect
                name="companyName"
                value={selectedCompany}
                required
                placeholder="Pilih Company"
                onValueChange={setSelectedCompany}
                options={[
                  { value: "", label: "Pilih Company" },
                  ...(companies ?? []).map((company) => ({
                    value: company.name,
                    label: company.name,
                  })),
                ]}
              />
            </label>
          ) : (
            <label>
              <span>Company</span>
              <input value={assessment.companyName} disabled />
            </label>
          )}

          <label>
            <span>Auditor</span>
            <CustomSelect
              key={`auditor-${selectedCompany || assessment?.companyName || "all"}`}
              name="auditorId"
              defaultValue={assessment?.auditorId ?? ""}
              required
              placeholder="Pilih Auditor"
              options={[
                { value: "", label: "Pilih Auditor" },
                ...filteredAuditors.map((auditor) => ({
                  value: auditor.id,
                  label: auditor.name,
                })),
              ]}
            />
          </label>

          <label>
            <span>Auditee</span>
            <CustomSelect
              key={`auditee-${selectedCompany || assessment?.companyName || "all"}`}
              name="auditeeId"
              defaultValue={assessment?.auditeeId ?? ""}
              required
              placeholder="Pilih Auditee"
              options={[
                { value: "", label: "Pilih Auditee" },
                ...filteredAuditees.map((auditee) => ({
                  value: auditee.id,
                  label: auditee.name,
                })),
              ]}
            />
          </label>

          <label>
            <span>Baseline (1-5)</span>
            <input name="targetScore" type="number" min="1" max="5" step="1" defaultValue={assessment?.targetScore ?? 3} />
          </label>

          <label>
            <span>Start Date</span>
            <input name="startDate" type="date" defaultValue={assessment ? toDateInput(assessment.startDate) : ""} required />
          </label>

          <label>
            <span>Due Date</span>
            <input name="dueDate" type="date" defaultValue={assessment?.dueDate ? toDateInput(assessment.dueDate) : ""} />
          </label>

          <label className="full-field">
            <span>Description</span>
            <textarea name="description" defaultValue={assessment?.description ?? ""} placeholder="Deskripsi assessment" />
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

function toDateInput(date: Date) {
  return new Date(date).toISOString().split("T")[0];
}
