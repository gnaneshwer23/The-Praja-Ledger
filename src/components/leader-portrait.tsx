export function LeaderPortrait({
  name,
  photo,
}: {
  name: string;
  photo?: string;
}) {
  if (photo) {
    return <img className="portrait" src={photo} alt={name} />;
  }

  const letters = name
    .replace(/\./g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();

  return (
    <span className="portrait portrait-fallback" aria-hidden="true">
      {letters}
    </span>
  );
}
