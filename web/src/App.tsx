import { AudioLines, ChevronLeft, CircleHelp, Mic } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createRecording, deleteRecording, listRecordings, renameRecording, type Recording } from './api/recordings'
import { RecordingPlayer } from './components/RecordingPlayer'
import { RecordingStudio } from './components/RecordingStudio'

const SIDEBAR_PREFERENCE = 'timbre.sidebar.collapsed'

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem(SIDEBAR_PREFERENCE) === 'true')
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)

  useEffect(() => { void listRecordings().then(setRecordings).catch(() => setRecordings([])) }, [])
  useEffect(() => { localStorage.setItem(SIDEBAR_PREFERENCE, String(sidebarCollapsed)) }, [sidebarCollapsed])

  const selected = recordings.find((recording) => recording.id === selectedId) ?? null
  async function handleCaptured(audio: Blob, durationMs: number) {
    const recording = await createRecording(audio, durationMs)
    setRecordings((current) => [recording, ...current])
    setSelectedId(recording.id)
  }
  async function handleRename(recording: Recording, title: string) {
    const updated = await renameRecording(recording.id, title)
    setRecordings((current) => current.map((item) => item.id === updated.id ? updated : item))
  }
  async function handleDelete(recording: Recording) {
    await deleteRecording(recording.id)
    setRecordings((current) => current.filter((item) => item.id !== recording.id))
    setSelectedId((id) => id === recording.id ? null : id)
  }

  return <div className="flex min-h-screen bg-[#121212] text-zinc-100">
    <aside className={`${sidebarCollapsed ? 'w-[72px] px-3' : 'w-[260px] px-3'} sticky top-0 z-10 flex h-screen shrink-0 flex-col border-r border-zinc-800 bg-[#171718] py-5 transition-all`}>
      <div className="flex items-center gap-2 px-3 pb-6 text-xl font-bold tracking-tight"><AudioLines size={22} className="text-blue-300" />{!sidebarCollapsed && <span>timbre</span>}</div>
      <button className="absolute -right-4 top-5 z-20 grid h-8 w-8 place-items-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-400" aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setSidebarCollapsed((value) => !value)}><ChevronLeft size={18} className={sidebarCollapsed ? 'rotate-180' : ''} /></button>
      <nav aria-label="Workspace"><button className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${selected ? 'text-zinc-400' : 'bg-zinc-700 text-white'}`} onClick={() => setSelectedId(null)}><Mic size={18} />{!sidebarCollapsed && <span>Record</span>}</button></nav>
      {!sidebarCollapsed && <div className="mt-6 min-h-0 flex-1 overflow-y-auto" aria-label="Recordings">
        <p className="px-2 text-[10px] uppercase tracking-widest text-zinc-500">Recordings</p>
        <div className="mt-3 space-y-2">{recordings.map((recording) => <button key={recording.id} className={`grid w-full gap-1 rounded-lg px-3 py-2.5 text-left ${selected?.id === recording.id ? 'bg-zinc-700 text-white' : 'text-zinc-300 hover:bg-zinc-800'}`} onClick={() => setSelectedId(recording.id)}>
          <span className="truncate text-xs">{recording.title}</span><span className="text-[11px] text-zinc-500">{Math.ceil(recording.duration_ms / 1000)} sec</span>
        </button>)}</div>
      </div>}
      <div className="mt-auto flex items-center gap-2 px-2 text-xs text-zinc-500"><span className="h-2 w-2 rounded-full bg-emerald-300" />{!sidebarCollapsed && <span>Local workspace</span>}<button className="ml-auto" aria-label="Help"><CircleHelp size={17} /></button></div>
    </aside>
    <main className="relative z-0 min-w-0 flex-1 bg-[#151516]">
      {selected ? <RecordingPlayer recording={selected} onRename={handleRename} onDelete={handleDelete} /> : <RecordingStudio onCaptured={handleCaptured} />}
    </main>
  </div>
}
