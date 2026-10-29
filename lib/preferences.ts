export function readPreference(name: string): string | null {
  try {
    return localStorage.getItem(`tick-${name}`);
  } catch {
    return null;
  }
}

export function writePreference(name: string, value: string): void {
  localStorage.setItem(`tick-${name}`, value);
}
