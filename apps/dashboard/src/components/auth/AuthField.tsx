// Labelled input for the sign-in and first-run forms. Extra props go to the <input>.
export default function AuthField({
  label,
  value,
  onChange,
  ...input
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'className'>) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input
        className="input h-10"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        {...input}
      />
    </label>
  );
}
