"use client";

type RequirementDeleteDialogProps = {
  requirementTitle: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function RequirementDeleteDialog({
  requirementTitle,
  loading = false,
  onClose,
  onConfirm,
}: RequirementDeleteDialogProps) {
  return (
    <div className="modal-backdrop">
      <div className="modal-surface max-w-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-orange">Confirm Requirement Action</p>
            <h3 className="mt-2 text-2xl font-semibold text-brand-navy">Delete Requirement</h3>
            <p className="mt-2 text-sm leading-6 text-brand-slate">
              Are you sure you want to delete &quot;{requirementTitle}&quot;?
            </p>
          </div>
          <button
            type="button"
            onClick={() => (!loading ? onClose() : null)}
            className="modal-close-button"
            disabled={loading}
            aria-label="Close confirmation"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={onConfirm} disabled={loading}>
            {loading ? "Deleting..." : "Confirm Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
