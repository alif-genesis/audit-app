"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Download, Plus, Save, Upload } from "lucide-react";
import { CustomSelect } from "@/components/custom-select";
import { Toast } from "@/components/toast";
import {
  addAuditQuestionAction,
  updateAuditTypeAction,
  uploadAuditQuestionsAction,
  type AuditTypeState,
} from "../actions";

type AuditTypeEditorProps = {
  auditType: {
    id: string;
    name: string;
    isoStandard: string;
    description: string | null;
  };
};

const initialState: AuditTypeState = {};
const cobitObjectives = [
  "EDM01",
  "EDM02",
  "EDM03",
  "EDM04",
  "EDM05",
  "APO01",
  "APO02",
  "APO03",
  "APO04",
  "APO05",
  "APO06",
  "APO07",
  "APO08",
  "APO09",
  "APO10",
  "APO11",
  "APO12",
  "APO13",
  "APO14",
  "BAI01",
  "BAI02",
  "BAI03",
  "BAI04",
  "BAI05",
  "BAI06",
  "BAI07",
  "BAI08",
  "BAI09",
  "BAI10",
  "BAI11",
  "DSS01",
  "DSS02",
  "DSS03",
  "DSS04",
  "DSS05",
  "DSS06",
  "MEA01",
  "MEA02",
  "MEA03",
  "MEA04",
];

export function AuditTypeEditor({ auditType }: AuditTypeEditorProps) {
  const [detailState, detailAction] = useActionState(updateAuditTypeAction, initialState);
  const [questionState, questionAction] = useActionState(addAuditQuestionAction, initialState);
  const [uploadState, uploadAction] = useActionState(uploadAuditQuestionsAction, initialState);
  const [manualDomain, setManualDomain] = useState("MEA");
  const toast = detailState.toast ?? questionState.toast ?? uploadState.toast;
  const isCobit = `${auditType.name} ${auditType.isoStandard}`.toUpperCase().includes("COBIT");
  const objectiveOptions = useMemo(
    () => cobitObjectives.filter((objective) => objective.startsWith(manualDomain)),
    [manualDomain],
  );

  return (
    <>
      <Toast type={toast?.type} message={toast?.message} />

      <section className="users-panel">
        <div className="section-heading">
          <div>
            <h2>Detail Audit</h2>
            <p>Simpan informasi framework audit.</p>
          </div>
        </div>

        <form className="modal-form two-column-form audit-type-form" action={detailAction}>
          <input name="id" type="hidden" value={auditType.id} />
          <label>
            <span>Nama Framework</span>
            <input name="name" defaultValue={auditType.name} required />
          </label>
          <label>
            <span>Framework / Standar</span>
            <input name="isoStandard" defaultValue={auditType.isoStandard} required />
          </label>
          <label className="full-field">
            <span>Deskripsi</span>
            <textarea name="description" defaultValue={auditType.description ?? ""} />
          </label>
          <div className="modal-actions full-field">
            <SubmitButton icon="save" label="Simpan Detail" />
          </div>
        </form>
      </section>

      <section className="users-panel">
        <div className="section-heading">
          <div>
            <h2>Upload Template Pertanyaan</h2>
            <p>Download template XLSX, isi klausul ISO atau domain COBIT seperti APO01/DSS01, lalu upload kembali.</p>
          </div>
          <a
            className="primary-button"
            href={isCobit ? "/api/audit-question-template?framework=cobit" : "/api/audit-question-template"}
            style={{ minWidth: "180px", textAlign: "center" }}
          >
            <Download size={17} aria-hidden="true" />
            Download Template
          </a>
        </div>

        {isCobit ? (
          <div style={{ display: "grid", gap: "12px" }}>
            {["EDM", "APO", "BAI", "DSS", "MEA"].map((domainGroup) => (
              <form className="upload-form cobit-upload-form" action={uploadAction} key={domainGroup}>
                <input name="auditTypeId" type="hidden" value={auditType.id} />
                <input name="domainGroup" type="hidden" value={domainGroup} />
                <strong style={{ minWidth: "64px" }}>{domainGroup}</strong>
                <input
                  name="file"
                  type="file"
                  accept=".xlsx,.csv,text/csv,.txt"
                  required
                />
                <SubmitButton icon="upload" label={`Upload ${domainGroup}`} />
              </form>
            ))}
          </div>
        ) : (
          <form className="upload-form" action={uploadAction}>
            <input name="auditTypeId" type="hidden" value={auditType.id} />
            <input
              name="file"
              type="file"
              accept=".xlsx,.csv,text/csv,.txt"
              required
            />
            <SubmitButton icon="upload" label="Upload Pertanyaan" />
          </form>
        )}
      </section>

      <section className="users-panel">
        <div className="section-heading">
          <div>
            <h2>Tambah Pertanyaan Manual</h2>
            <p>Gunakan untuk menambah klausul satu per satu.</p>
          </div>
        </div>

        <form className="modal-form two-column-form audit-type-form" action={questionAction}>
          <input name="auditTypeId" type="hidden" value={auditType.id} />
          {isCobit ? (
            <>
              <label>
                <span>Domain</span>
                <CustomSelect
                  name="domain"
                  value={manualDomain}
                  required
                  onValueChange={setManualDomain}
                  options={["EDM", "APO", "BAI", "DSS", "MEA"].map((domain) => ({
                    value: domain,
                    label: domain,
                  }))}
                />
              </label>
              <label>
                <span>Objective</span>
                <CustomSelect
                  key={`objective-${manualDomain}`}
                  name="objectiveId"
                  required
                  defaultValue={objectiveOptions[0] ?? ""}
                  options={objectiveOptions.map((objective) => ({
                    value: objective,
                    label: objective,
                  }))}
                />
              </label>
              <label>
                <span>Level</span>
                <CustomSelect
                  name="level"
                  defaultValue="1"
                  required
                  options={[1, 2, 3, 4, 5].map((level) => ({
                    value: String(level),
                    label: `Level ${level}`,
                  }))}
                />
              </label>
            </>
          ) : (
            <label>
              <span>Klausul</span>
              <input name="clause" placeholder="4.1 / A.5.1" required />
            </label>
          )}
          <label>
            <span>Judul</span>
            <input name="title" placeholder={isCobit ? "Managed Performance and Conformance Monitoring" : "Understanding The Organization"} />
          </label>
          <label className="full-field">
            <span>Prasyarat Standar</span>
            <textarea name="requirement" placeholder="Isi requirement standar atau tujuan domain COBIT" />
          </label>
          <label className="full-field">
            <span>Panduan / Pertanyaan</span>
            <textarea name="question" placeholder="Pertanyaan audit" required />
          </label>
          <div className="modal-actions full-field">
            <SubmitButton icon="save" label="Simpan Pertanyaan" />
          </div>
        </form>
      </section>
    </>
  );
}

function SubmitButton({
  icon,
  label,
}: {
  icon: "save" | "plus" | "upload";
  label: string;
}) {
  const { pending } = useFormStatus();
  const Icon = icon === "save" ? Save : icon === "upload" ? Upload : Plus;

  return (
    <button className="primary-button modal-submit" type="submit" disabled={pending}>
      <Icon size={16} aria-hidden="true" />
      {pending ? "Menyimpan..." : label}
    </button>
  );
}
