interface TrackerIconProps {
  icon?: string | null;
  name: string;
  color?: string | null;
}

export function TrackerIcon({ icon, name, color }: TrackerIconProps) {
  const backgroundColor = color || 'hsl(var(--primary))';
  const firstLetter = name.charAt(0).toUpperCase();

  return (
    <div
      className="tracker-icon h-12 w-12 rounded-lg flex items-center justify-center text-white font-semibold text-lg"
      style={{ backgroundColor }}
      aria-label={`Ikona trackera ${name}`}
    >
      {icon ? (
        <span className="text-2xl" role="img" aria-label={icon}>
          {icon}
        </span>
      ) : (
        firstLetter
      )}
    </div>
  );
}
