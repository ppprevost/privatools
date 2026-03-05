import type { FormField, EditOp } from '@/lib/pdf/edit-types';

type FormPanelProps = {
  fields: FormField[];
  ops: EditOp[];
  onOpsChange: (ops: EditOp[]) => void;
};

export default function FormPanel({ fields, ops, onOpsChange }: Readonly<FormPanelProps>) {
  if (fields.length === 0) return null;

  const getTextValue = (name: string): string => {
    const op = ops.find((o): o is Extract<EditOp, { type: 'form_text' }> => o.type === 'form_text' && o.fieldName === name);
    return op?.value ?? '';
  };

  const getCheckboxValue = (name: string): boolean => {
    const op = ops.find((o): o is Extract<EditOp, { type: 'form_checkbox' }> => o.type === 'form_checkbox' && o.fieldName === name);
    return op?.checked ?? false;
  };

  const upsertOp = (newOp: EditOp & { fieldName: string }) => {
    const filtered = ops.filter((o) => {
      if (o.type === 'form_text' && newOp.type === 'form_text') return o.fieldName !== newOp.fieldName;
      if (o.type === 'form_checkbox' && newOp.type === 'form_checkbox') return o.fieldName !== newOp.fieldName;
      return true;
    });
    onOpsChange([...filtered, newOp]);
  };

  return (
    <div className="p-6 bg-white rounded-2xl border-[3px] border-slate-900 shadow-[var(--shadow-brutalist-sm)] space-y-4">
      <h3 className="font-black text-slate-900 text-lg">Form Fields</h3>
      <div className="space-y-3">
        {fields.map((field) => (
          <div key={field.name} className="flex items-center gap-3">
            <label className="text-sm font-semibold text-slate-700 min-w-[120px] truncate">{field.name}</label>
            {(field.field_type === 'text' || field.field_type === 'select') && (
              <input
                type="text"
                className="flex-1 border-2 border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:border-slate-900 focus:outline-none"
                value={getTextValue(field.name)}
                onChange={(e) => upsertOp({ type: 'form_text', fieldName: field.name, value: e.target.value })}
              />
            )}
            {(field.field_type === 'checkbox' || field.field_type === 'radio') && (
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-2 border-slate-300 accent-indigo-600"
                checked={getCheckboxValue(field.name)}
                onChange={(e) => upsertOp({ type: 'form_checkbox', fieldName: field.name, checked: e.target.checked })}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
