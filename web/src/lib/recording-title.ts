export function localRecordingTitle(
  now = new Date(),
  locale = navigator.language,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
) {
  const timestamp = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(now)

  return `Recording ${timestamp}`
}
