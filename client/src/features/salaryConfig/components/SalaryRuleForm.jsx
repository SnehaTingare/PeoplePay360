import { useState } from 'react'
import ErrorBanner from '../../../shared/components/ErrorBanner/ErrorBanner'
import FormField from '../../../shared/components/FormField/FormField'
import { requiredText, nonNegativeNumber, nonNegativeInteger, oneOf } from '../../../shared/validation/formValidation'
import { CALCULATION_TYPES, CATEGORIES, recordId } from '../salaryConfigUtils'

const initial = (rule, structureId) => ({ salaryStructureId: recordId(rule?.salaryStructure) || structureId || '', name: rule?.name || '', code: rule?.code || '', category: rule?.category || 'BASIC', sequence: rule?.sequence ?? 10, calculationType: rule?.calculationType || 'FIXED', fixedAmount: rule?.fixedAmount ?? '', percentage: rule?.percentage ?? '', percentageBase: rule?.percentageBase || 'CONTRACT_WAGE', formula: rule?.formula || '' })
export default function SalaryRuleForm({ rule, structureId, structures, rules, error, busy, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => initial(rule, structureId));
  const [inlineError, setInlineError] = useState('');
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value })
  const submit = (event) => {
    event.preventDefault();
    const validation = [
      oneOf(form.category, CATEGORIES, 'Category'),
      oneOf(form.calculationType, CALCULATION_TYPES, 'Calculation type'),
      nonNegativeInteger(form.sequence, 'Sequence'),
      requiredText(form.name, 'Name'),
    ];
    const nextError = validation.find(Boolean);
    if (nextError) {
      setInlineError(nextError);
      return;
    }
    if (form.calculationType === 'FIXED') {
      const fixedError = nonNegativeNumber(form.fixedAmount, 'Fixed amount');
      if (fixedError) {
        setInlineError(fixedError);
        return;
      }
    }
    if (form.calculationType === 'PERCENTAGE') {
      const percentageError = nonNegativeNumber(form.percentage, 'Percentage');
      if (percentageError) {
        setInlineError(percentageError);
        return;
      }
    }
    if (form.calculationType === 'FORMULA') {
      const formulaError = requiredText(form.formula, 'Formula', 2000);
      if (formulaError) {
        setInlineError(formulaError);
        return;
      }
    }
    setInlineError('');
    const payload = { salaryStructureId: form.salaryStructureId, name: form.name.trim(), code: form.code.trim(), category: form.category, sequence: Number(form.sequence), calculationType: form.calculationType };
    if (form.calculationType === 'FIXED') payload.fixedAmount = Number(form.fixedAmount);
    if (form.calculationType === 'PERCENTAGE') { payload.percentage = Number(form.percentage); payload.percentageBase = form.percentageBase.trim() }
    if (form.calculationType === 'FORMULA') payload.formula = form.formula.trim();
    onSubmit(payload)
  }
  const bases = ['CONTRACT_WAGE', ...rules.filter((item) => recordId(item.salaryStructure) === form.salaryStructureId && recordId(item) !== recordId(rule) && Number(item.sequence) < Number(form.sequence)).map((item) => item.code)]
  return <form className="panel form-panel salary-rule-form" onSubmit={submit}><ErrorBanner message={inlineError || error} /><p className="sequence-help">Rules execute in ascending sequence. Percentage and formula references must point to valid earlier rules.</p><div className="form-grid"><FormField label="Salary Structure *"><select name="salaryStructureId" required value={form.salaryStructureId} onChange={update}><option value="">Select Structure</option>{structures.map((item) => <option key={recordId(item)} value={recordId(item)}>{item.name} ({item.code})</option>)}</select></FormField><FormField label="Sequence *" hint="Lower sequence numbers execute first."><input name="sequence" required type="number" min="0" step="1" value={form.sequence} onChange={update} /></FormField><FormField label="Name *"><input name="name" required value={form.name} onChange={update} /></FormField><FormField label="Code *" hint="Arithmetic identifier; CONTRACT_WAGE is reserved."><input name="code" required pattern="[A-Za-z_][A-Za-z0-9_]*" value={form.code} onChange={update} /></FormField><FormField label="Category *"><select name="category" value={form.category} onChange={update}>{CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select></FormField><FormField label="Calculation Type *"><select name="calculationType" value={form.calculationType} onChange={update}>{CALCULATION_TYPES.map((value) => <option key={value}>{value}</option>)}</select></FormField>{form.calculationType === 'FIXED' && <FormField label="Fixed amount *"><input name="fixedAmount" required type="number" min="0" step="0.01" value={form.fixedAmount} onChange={update} /></FormField>}{form.calculationType === 'PERCENTAGE' && <><FormField label="Percentage *"><input name="percentage" required type="number" min="0" step="0.01" value={form.percentage} onChange={update} /></FormField><FormField label="Percentage base/reference *" hint="CONTRACT_WAGE or an earlier rule code."><select name="percentageBase" required value={form.percentageBase} onChange={update}><option value="">Select percentage base</option><option value="CONTRACT_WAGE">Contract Wage</option>{bases.filter((value) => value !== 'CONTRACT_WAGE').map((value) => <option key={value} value={value}>{value}</option>)}</select></FormField></>}{form.calculationType === 'FORMULA' && <FormField label="Formula *" hint="Validated arithmetic only. Formulas execute on the backend."><textarea name="formula" required rows="5" maxLength={2000} value={form.formula} onChange={update} /></FormField>}</div><div className="form-actions"><button type="button" className="button button--secondary" disabled={busy} onClick={onCancel}>Cancel</button><button className="button" disabled={busy}>{busy ? 'Saving...' : 'Save Rule'}</button></div></form>
}
