// src/components/shared/Spinner.js
export default function Spinner({ size = 'md', color = 'primary' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' };
  const colors = { primary: 'border-primary-600', white: 'border-white' };
  return (
    <div
      className={`${sizes[size]} ${colors[color]} border-2 border-t-transparent rounded-full animate-spin`}
      role="status"
      aria-label="Caricamento..."
    />
  );
}
