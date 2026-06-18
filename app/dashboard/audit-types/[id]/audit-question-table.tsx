"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Save, Settings, Trash2, X } from "lucide-react";
import { Toast } from "@/components/toast";
import {
  deleteAuditQuestionAction,
  updateAuditQuestionAction,
  type AuditTypeState,
} from "../actions";

type Question = {
  id: string;
  auditTypeId: string;
  clause: string;
  title: string | null;
  requirement: string | null;
  question: string;
};

const initialState: AuditTypeState = {};

export function AuditQuestionTable({
  auditTypeId,
  questions,
}: {
  auditTypeId: string;
  questions: Question[];
}) {
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [state, formAction] = useActionState(updateAuditQuestionAction, initialState);

  useEffect(() => {
    if (state.toast?.type === "success") {
      const timeout = window.setTimeout(() => setEditingQuestion(null), 700);
      return () => window.clearTimeout(timeout);
    }
  }, [state.toast]);

  return (
    <>
      <Toast type={state.toast?.type} message={state.toast?.message} />

      <div className="table-wrap">
        <table className="user-table audit-question-table">
          <thead>
            <tr>
              <th>Klausul</th>
              <th>Judul</th>
              <th>Prasyarat Standar</th>
              <th>Panduan / Pertanyaan</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((question) => (
              <tr key={question.id}>
                <td>{question.clause}</td>
                <td>{question.title || "-"}</td>
                <td className="multiline-cell">{question.requirement || "-"}</td>
                <td className="multiline-cell">{question.question}</td>
                <td>
                  <div className="row-actions">
                    <button
                      aria-label="Edit pertanyaan"
                      type="button"
                      onClick={() => setEditingQuestion(question)}
                    >
                      <Settings size={17} aria-hidden="true" />
                    </button>
                    <form action={deleteAuditQuestionAction}>
                      <input name="id" type="hidden" value={question.id} />
                      <input name="auditTypeId" type="hidden" value={auditTypeId} />
                      <button aria-label="Hapus pertanyaan" type="submit">
                        <Trash2 size={17} aria-hidden="true" />
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingQuestion ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-panel wide-modal-panel" role="dialog" aria-modal="true">
            <button
              className="modal-close"
              type="button"
              aria-label="Tutup"
              onClick={() => setEditingQuestion(null)}
            >
              <X size={20} aria-hidden="true" />
            </button>

            <div className="modal-heading">
              <Settings size={28} aria-hidden="true" />
              <div>
                <h2>Edit Pertanyaan Audit</h2>
                <p>Perbarui klausul, prasyarat, dan panduan pertanyaan.</p>
              </div>
            </div>

            <form className="modal-form two-column-form audit-type-form" action={formAction}>
              <input name="id" type="hidden" value={editingQuestion.id} />
              <input name="auditTypeId" type="hidden" value={auditTypeId} />
              <label>
                <span>Klausul</span>
                <input name="clause" defaultValue={editingQuestion.clause} required />
              </label>
              <label>
                <span>Judul</span>
                <input name="title" defaultValue={editingQuestion.title ?? ""} />
              </label>
              <label className="full-field">
                <span>Prasyarat Standar</span>
                <textarea name="requirement" defaultValue={editingQuestion.requirement ?? ""} />
              </label>
              <label className="full-field">
                <span>Panduan / Pertanyaan</span>
                <textarea name="question" defaultValue={editingQuestion.question} required />
              </label>
              <div className="modal-actions full-field">
                <button className="secondary-button" type="button" onClick={() => setEditingQuestion(null)}>
                  Batal
                </button>
                <SubmitButton />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="primary-button modal-submit" type="submit" disabled={pending}>
      <Save size={16} aria-hidden="true" />
      {pending ? "Menyimpan..." : "Simpan Pertanyaan"}
    </button>
  );
}
