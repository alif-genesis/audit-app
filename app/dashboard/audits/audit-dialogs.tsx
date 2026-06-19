"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Plus, Settings, Trash2, X } from "lucide-react";
import { CustomSelect } from "@/components/custom-select";
import { Toast } from "@/components/toast";
import { useEscapeClose } from "@/components/use-escape-close";
import {
  createAuditAction,
  deleteAuditAction,
  updateAuditAction,
  type AuditFormState,
} from "./actions";

type AuditData = {
  id: string;
  title: string;
  companyName: string;
  auditTypeId: string;
  mode: "GAP_ASSESSMENT" | "AUDIT";
  status: string;
  startDate: Date;
  description: string | null;
  assignments?: Array<{
    auditor?: { id: string; name: string } | null;
    auditee?: { id: string; name: string } | null;
  }>;
};

type AuditTypeData = {
  id: string;
  name: string;
  isoStandard: string;
};

type DesignFactorAssessmentData = {
  id: string;
  name: string;
  companyName: string;
  status: string;
};

type UserData = {
  id: string;
  name: string;
  email: string;
  role: string;
  companyName: string | null;
};

const initialState: AuditFormState = {};

export function AddAuditDialog({
  companies,
  auditTypes,
  designFactorAssessments,
  users,
  cobitOnly = false,
}: {
  companies: Array<{ name: string }>;
  auditTypes: AuditTypeData[];
  designFactorAssessments: DesignFactorAssessmentData[];
  users: UserData[];
  cobitOnly?: boolean;
}) {
  const [modeModalOpen, setModeModalOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState<"GAP_ASSESSMENT" | "AUDIT" | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [state, formAction] = useActionState(createAuditAction, initialState);
  const closeAll = () => {
    setFormOpen(false);
    setModeModalOpen(false);
    setSelectedMode(null);
  };

  useEscapeClose(closeAll, modeModalOpen || formOpen);

  useEffect(() => {
    if (state.toast?.type === "success") {
      const timeout = window.setTimeout(closeAll, 700);
      return () => window.clearTimeout(timeout);
    }
  }, [state.toast]);

  const auditors = users.filter((u) => u.role === "AUDITOR");
  const auditees = users.filter((u) => u.role === "AUDITEE");

  return (
    <>
      <Toast type={state.toast?.type} message={state.toast?.message} />

      <button
        className="primary-button page-action"
        type="button"
        onClick={() => {
          if (cobitOnly) {
            setSelectedMode("AUDIT");
            setFormOpen(true);
            return;
          }
          setModeModalOpen(true);
        }}
      >
        <Plus size={17} aria-hidden="true" />
        {cobitOnly ? "Tambah Audit COBIT" : "Buat Audit"}
      </button>

      {!cobitOnly && modeModalOpen && !selectedMode ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-panel confirm-panel" role="dialog" aria-modal="true">
            <button
              className="modal-close"
              type="button"
              aria-label="Tutup"
              onClick={() => setModeModalOpen(false)}
            >
              <X size={20} aria-hidden="true" />
            </button>
            <div className="modal-heading">
              <CheckCircle2 size={28} aria-hidden="true" />
              <div>
                <h2>Pilih Mode Audit</h2>
                <p>Tentukan tipe audit yang ingin Anda jalankan.</p>
              </div>
            </div>
            <div className="modal-actions confirm-actions" style={{ gap: "12px", flexDirection: "column" }}>
              <button
                className="primary-button"
                type="button"
                onClick={() => {
                  setSelectedMode("GAP_ASSESSMENT");
                  setFormOpen(true);
                }}
                style={{ width: "100%", justifyContent: "center" }}
              >
                Gap Assessment
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={() => {
                  setSelectedMode("AUDIT");
                  setFormOpen(true);
                }}
                style={{ width: "100%", justifyContent: "center" }}
              >
                Audit Internal
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {formOpen && selectedMode ? (
        <AuditModal
          title="Buat Audit Baru"
          description={cobitOnly ? "Buat assessment capability COBIT dan assign auditor serta auditee." : "Buat program audit ISO dan assign auditor serta auditee."}
          action={formAction}
          onClose={closeAll}
          submitLabel="Buat Audit"
          companies={companies}
          auditTypes={auditTypes}
          designFactorAssessments={designFactorAssessments}
          auditors={auditors}
          auditees={auditees}
          mode={selectedMode}
          cobitOnly={cobitOnly}
        />
      ) : null}
    </>
  );
}

export function EditAuditDialog({
  audit,
  auditTypes,
  users,
}: {
  audit: AuditData;
  auditTypes: AuditTypeData[];
  users: UserData[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction] = useActionState(updateAuditAction, initialState);
  useEscapeClose(() => setIsOpen(false), isOpen);

  useEffect(() => {
    if (state.toast?.type === "success") {
      const timeout = window.setTimeout(() => setIsOpen(false), 700);
      return () => window.clearTimeout(timeout);
    }
  }, [state.toast]);

  const auditors = users.filter((u) => u.role === "AUDITOR");
  const auditees = users.filter((u) => u.role === "AUDITEE");

  return (
    <>
      <Toast type={state.toast?.type} message={state.toast?.message} />

      <button aria-label="Edit audit" type="button" onClick={() => setIsOpen(true)}>
        <Settings size={17} aria-hidden="true" />
      </button>

      {isOpen ? (
        <AuditModal
          title="Edit Audit"
          description="Perbarui detail audit dan assignment."
          action={formAction}
          onClose={() => setIsOpen(false)}
          submitLabel="Simpan Audit"
          audit={audit}
          auditTypes={auditTypes}
          auditors={auditors}
          auditees={auditees}
        />
      ) : null}
    </>
  );
}

export function DeleteAuditButton({
  auditId,
  auditTitle,
}: {
  auditId: string;
  auditTitle: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  useEscapeClose(() => setIsOpen(false), isOpen);

  return (
    <>
      <button aria-label="Hapus audit" type="button" onClick={() => setIsOpen(true)}>
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
                <h2>Hapus Audit</h2>
                <p>Anda yakin ingin menghapus audit "{auditTitle}"?</p>
              </div>
            </div>
            <form className="modal-actions confirm-actions" action={deleteAuditAction}>
              <input name="id" type="hidden" value={auditId} />
              <button className="secondary-button" type="button" onClick={() => setIsOpen(false)}>
                Batal
              </button>
              <button className="danger-button" type="submit">
                Hapus Audit
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function AuditModal({
  title,
  description,
  action,
  onClose,
  submitLabel,
  audit,
  auditTypes,
  designFactorAssessments = [],
  auditors,
  auditees,
  companies,
  mode,
  cobitOnly = false,
}: {
  title: string;
  description: string;
  action: (payload: FormData) => void;
  onClose: () => void;
  submitLabel: string;
  audit?: AuditData;
  auditTypes: AuditTypeData[];
  designFactorAssessments?: DesignFactorAssessmentData[];
  auditors: UserData[];
  auditees: UserData[];
  companies?: Array<{ name: string }>;
  mode?: "GAP_ASSESSMENT" | "AUDIT";
  cobitOnly?: boolean;
}) {
  const [formError, setFormError] = useState<string>("");
  const [selectedCompany, setSelectedCompany] = useState(audit?.companyName ?? "");
  const [selectedAuditTypeId, setSelectedAuditTypeId] = useState(audit?.auditTypeId ?? (cobitOnly && auditTypes.length === 1 ? auditTypes[0].id : ""));
  const [cobitScope, setCobitScope] = useState<"ALL_40" | "BUMN_24" | "DESIGN_FACTOR">("DESIGN_FACTOR");
  const [baseline, setBaseline] = useState("3");
  useEscapeClose(onClose);
  const selectedAssignment = audit?.assignments?.[0];
  const selectedAuditType = auditTypes.find((auditType) => auditType.id === selectedAuditTypeId);
  const isCobit = cobitOnly
    ? true
    : selectedAuditType
      ? `${selectedAuditType.name} ${selectedAuditType.isoStandard}`.toUpperCase().includes("COBIT")
      : false;
  const filteredAuditors = selectedCompany
    ? auditors.filter((auditor) => auditor.companyName === selectedCompany)
    : auditors;
  const filteredAuditees = selectedCompany
    ? auditees.filter((auditee) => auditee.companyName === selectedCompany)
    : auditees;
  const filteredDesignFactors = selectedCompany
    ? designFactorAssessments.filter((assessment) => assessment.companyName === selectedCompany)
    : designFactorAssessments;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    setFormError("");

    const formData = new FormData(e.currentTarget);
    const titleVal = String(formData.get("title") || "").trim();
    const companyName = String(formData.get("companyName") || "").trim();
    const auditTypeId = String(formData.get("auditTypeId") || "").trim();
    const modeVal = String(formData.get("mode") || "").trim();
    const startDate = String(formData.get("startDate") || "").trim();
    const auditorId = String(formData.get("auditorId") || "").trim();
    const auditeeId = String(formData.get("auditeeId") || "").trim();
    const cobitScopeVal = String(formData.get("cobitScope") || "").trim();
    const designFactorAssessmentId = String(formData.get("designFactorAssessmentId") || "").trim();

    // Validation
    if (!titleVal) {
      setFormError("❌ Judul audit harus diisi");
      e.preventDefault();
      return;
    }

    if (!audit && !companyName) {
      setFormError("❌ Perusahaan harus dipilih");
      e.preventDefault();
      return;
    }

    if (!audit && !auditTypeId) {
      setFormError("❌ Framework audit harus dipilih");
      e.preventDefault();
      return;
    }

    if (!modeVal) {
      setFormError("❌ Mode audit harus dipilih");
      e.preventDefault();
      return;
    }

    if (!startDate) {
      setFormError("❌ Tanggal mulai harus dipilih");
      e.preventDefault();
      return;
    }

    if (!auditorId) {
      setFormError("❌ Auditor harus dipilih");
      e.preventDefault();
      return;
    }

    if (!auditeeId) {
      setFormError("❌ Auditee harus dipilih");
      e.preventDefault();
      return;
    }

    if (!audit && isCobit && !cobitScopeVal) {
      setFormError("❌ Scope Audit COBIT harus dipilih");
      e.preventDefault();
      return;
    }

    if (!audit && isCobit && cobitScopeVal === "DESIGN_FACTOR" && !designFactorAssessmentId) {
      setFormError("❌ Pilih Design Factor yang sudah submit untuk scope Level 2-4");
      e.preventDefault();
      return;
    }

    if (!audit && isCobit) {
      const baselineVal = Number(formData.get("cobitBaseline") || baseline);
      if (!Number.isFinite(baselineVal) || baselineVal < 0 || baselineVal > 5) {
        setFormError("❌ Baseline COBIT harus diisi antara 0 sampai 5");
        e.preventDefault();
        return;
      }
    }

    // Validation passed, form will submit normally to Server Action
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

        {formError && (
          <div
            style={{
              margin: "0 0 16px",
              padding: "12px 16px",
              borderRadius: "6px",
              background: "#ffebee",
              border: "1px solid #ffcdd2",
              color: "#c62828",
              fontSize: "14px",
              fontWeight: "850",
            }}
          >
            {formError}
          </div>
        )}

        <form className="modal-form two-column-form" action={action} onSubmit={handleSubmit}>
          {audit ? <input name="id" type="hidden" value={audit.id} /> : null}

          <label>
            <span>Judul Audit</span>
            <input
              name="title"
              defaultValue={audit?.title ?? ""}
              placeholder="Contoh: ISO 27001 2024"
              required
            />
          </label>

          {!audit ? (
            <label>
              <span>Perusahaan</span>
              <CustomSelect
                name="companyName"
                value={selectedCompany}
                required
                placeholder="Pilih Perusahaan"
                onValueChange={setSelectedCompany}
                options={[
                  { value: "", label: "Pilih Perusahaan" },
                  ...(companies ?? []).map((company) => ({
                    value: company.name,
                    label: company.name,
                  })),
                ]}
              />
            </label>
          ) : null}

          {!audit ? (
            <label>
              <span>Framework Audit</span>
              <CustomSelect
                name="auditTypeId"
                required
                value={selectedAuditTypeId}
                placeholder="Pilih Framework"
                onValueChange={setSelectedAuditTypeId}
                options={[
                  { value: "", label: "Pilih Framework" },
                  ...auditTypes.map((auditType) => ({
                    value: auditType.id,
                    label: `${auditType.name}${auditType.isoStandard ? ` - ${auditType.isoStandard}` : ""}`,
                  })),
                ]}
              />
            </label>
          ) : null}

          {!audit && isCobit ? (
            <label>
              <span>Baseline Capability</span>
              <input
                name="cobitBaseline"
                type="number"
                min="0"
                max="5"
                step="0.01"
                value={baseline}
                onChange={(event) => setBaseline(event.target.value)}
                required
              />
            </label>
          ) : null}

          {!audit && isCobit ? (
            <div className="full-field" style={{ display: "grid", gap: "12px" }}>
              <div>
                <span style={{ display: "block", fontWeight: 900, color: "#1d2b44", marginBottom: "8px" }}>
                  Scope Audit COBIT
                </span>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "10px",
                  }}
                >
                  {[
                    { value: "DESIGN_FACTOR", title: "Design Factor Level 2-4", desc: "Otomatis ambil domain adopsi dari Summary, kecuali Level 1." },
                    { value: "ALL_40", title: "Seluruh Domain", desc: "Gunakan semua 40 objective COBIT." },
                    { value: "BUMN_24", title: "24 Domain BUMN", desc: "Gunakan daftar domain sesuai regulasi BUMN." },
                  ].map((option) => (
                    <label
                      key={option.value}
                      style={{
                        border: cobitScope === option.value ? "2px solid #1c57df" : "1px solid #cfe0f5",
                        borderRadius: "8px",
                        padding: "12px",
                        background: cobitScope === option.value ? "#f1f7ff" : "#fff",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        name="cobitScope"
                        type="radio"
                        value={option.value}
                        checked={cobitScope === option.value}
                        onChange={() => setCobitScope(option.value as "ALL_40" | "BUMN_24" | "DESIGN_FACTOR")}
                        style={{ marginRight: "8px" }}
                      />
                      <strong>{option.title}</strong>
                      <small style={{ display: "block", color: "#667895", marginTop: "6px" }}>{option.desc}</small>
                    </label>
                  ))}
                </div>
              </div>

              {cobitScope === "DESIGN_FACTOR" ? (
                <label>
                  <span>Design Factor Sumber</span>
                  <CustomSelect
                    key={`df-source-${selectedCompany || "all"}`}
                    name="designFactorAssessmentId"
                    required
                    placeholder="Pilih Design Factor yang sudah submit"
                    options={[
                      { value: "", label: "Pilih Design Factor yang sudah submit" },
                      ...filteredDesignFactors.map((assessment) => ({
                        value: assessment.id,
                        label: `${assessment.name} - ${assessment.companyName} (${assessment.status})`,
                      })),
                    ]}
                  />
                </label>
              ) : null}
            </div>
          ) : null}

          {cobitOnly ? (
            <input type="hidden" name="mode" value="AUDIT" />
          ) : (
            <label>
              <span>Mode Audit</span>
              {/* If `mode` prop is provided (chosen via the modal), include a hidden input
                  so the value is submitted even when the visible select is disabled */}
              {mode ? <input type="hidden" name="mode" value={mode} /> : null}
              <CustomSelect
                name={mode ? "modeDisplay" : "mode"}
                defaultValue={mode ?? audit?.mode ?? "GAP_ASSESSMENT"}
                disabled={Boolean(mode)}
                required={!mode}
                options={[
                  { value: "GAP_ASSESSMENT", label: "Gap Assessment" },
                  { value: "AUDIT", label: "Audit Internal" },
                ]}
              />
            </label>
          )}

          <label>
            <span>Tanggal Mulai</span>
            <input
              name="startDate"
              type="date"
              defaultValue={
                audit
                  ? new Date(audit.startDate).toISOString().split("T")[0]
                  : ""
              }
              required
            />
          </label>

          <label>
            <span>Auditor</span>
            <CustomSelect
              key={`audit-auditor-${selectedCompany || audit?.companyName || "all"}`}
              name="auditorId"
              defaultValue={selectedAssignment?.auditor?.id ?? ""}
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
              key={`audit-auditee-${selectedCompany || audit?.companyName || "all"}`}
              name="auditeeId"
              defaultValue={selectedAssignment?.auditee?.id ?? ""}
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

          <label className="full-field">
            <span>Deskripsi</span>
            <textarea
              name="description"
              defaultValue={audit?.description ?? ""}
              placeholder="Deskripsi audit"
            />
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
