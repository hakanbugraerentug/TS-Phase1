/**
 * Returns true for elevated management titles (Müdür, Direktör, Başkan, and their
 * English equivalents). These users have broad access across the organisational hierarchy.
 */
export function isElevatedTitle(title: string): boolean {
  const t = title.toLowerCase();
  return (
    t.includes('müdür') || t.includes('mudur') || t.includes('manager') ||
    t.includes('direktör') || t.includes('direktor') || t.includes('director') ||
    t.includes('başkan') || t.includes('baskan') || t.includes('head') ||
    t.includes('chief')
  );
}
