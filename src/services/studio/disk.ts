// Gravação direto no disco (File System Access API, Chrome/Edge): o vídeo vai para o arquivo
// a cada segundo, sem acumular na memória. Horas de gravação não pesam na RAM.

type PermissionMode = { mode: 'readwrite' }
interface DirHandle extends FileSystemDirectoryHandle {
  queryPermission(d: PermissionMode): Promise<PermissionState>
  requestPermission(d: PermissionMode): Promise<PermissionState>
}
declare global {
  interface Window {
    showDirectoryPicker?: (o?: { id?: string; mode?: 'readwrite'; startIn?: string }) => Promise<FileSystemDirectoryHandle>
  }
}

const DB = 'athg-studio'
const STORE = 'kv'
const FOLDER_KEY = 'folder'

function idb<T>(run: (store: IDBObjectStore) => IDBRequest<T>, mode: IDBTransactionMode): Promise<T | undefined> {
  return new Promise((resolve) => {
    try {
      const open = indexedDB.open(DB, 1)
      open.onupgradeneeded = () => open.result.createObjectStore(STORE)
      open.onerror = () => resolve(undefined)
      open.onsuccess = () => {
        const req = run(open.result.transaction(STORE, mode).objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => resolve(undefined)
      }
    } catch {
      resolve(undefined)
    }
  })
}

export const diskSupported = () => typeof window.showDirectoryPicker === 'function'

/** Pasta escolhida antes (fica lembrada neste navegador). */
export async function savedFolder(): Promise<FileSystemDirectoryHandle | null> {
  return ((await idb((s) => s.get(FOLDER_KEY), 'readonly')) as FileSystemDirectoryHandle | undefined) ?? null
}

export async function pickFolder(): Promise<FileSystemDirectoryHandle> {
  const dir = await window.showDirectoryPicker!({ id: 'athg-studio', mode: 'readwrite', startIn: 'videos' })
  await idb((s) => s.put(dir, FOLDER_KEY), 'readwrite')
  return dir
}

/** Garante permissão de escrita (precisa de um clique do usuário na primeira vez da sessão). */
export async function ensureWritable(dir: FileSystemDirectoryHandle) {
  const d = dir as DirHandle
  const mode: PermissionMode = { mode: 'readwrite' }
  if ((await d.queryPermission(mode)) === 'granted') return true
  return (await d.requestPermission(mode)) === 'granted'
}

/** Arquivo sendo escrito em ordem; `written` = bytes já entregues ao disco. */
export interface DiskFile {
  name: string
  readonly written: number
  write(chunk: Blob | ArrayBuffer): void
  /** Reescreve bytes numa posição (ex.: cabeçalho do WAV). Use só antes de close(). */
  writeAt(position: number, data: ArrayBuffer): void
  truncate(size: number): void
  close(): Promise<void>
}

export async function createDiskFile(dir: FileSystemDirectoryHandle, name: string): Promise<DiskFile> {
  const handle = await dir.getFileHandle(name, { create: true })
  const stream = await handle.createWritable()
  let queue = Promise.resolve()
  let written = 0
  let failed = false
  return {
    name,
    get written() {
      return written
    },
    write(chunk) {
      const size = chunk instanceof Blob ? chunk.size : chunk.byteLength
      if (!size || failed) return
      queue = queue.then(() => stream.write(chunk)).then(
        () => void (written += size),
        () => void (failed = true),
      )
    },
    writeAt(position, data) {
      if (failed) return
      queue = queue.then(() => stream.write({ type: 'write', position, data })).catch(() => void (failed = true))
    },
    truncate(size) {
      if (failed) return
      queue = queue.then(() => stream.write({ type: 'truncate', size })).catch(() => void (failed = true))
    },
    async close() {
      await queue
      await stream.close().catch(() => {})
    },
  }
}

/** Duração (s) de um vídeo já salvo na pasta; null se não der para ler. */
export async function fileDuration(dir: FileSystemDirectoryHandle, name: string): Promise<number | null> {
  try {
    const file = await (await dir.getFileHandle(name)).getFile()
    const url = URL.createObjectURL(file)
    const v = document.createElement('video')
    v.muted = true
    v.preload = 'metadata'
    v.src = url
    const duration = await new Promise<number | null>((resolve) => {
      const timer = setTimeout(() => resolve(null), 15_000)
      v.onloadedmetadata = () => {
        if (Number.isFinite(v.duration)) return clearTimeout(timer), resolve(v.duration)
        // Alguns MP4 fragmentados só revelam a duração depois de buscar o fim.
        v.ondurationchange = () => Number.isFinite(v.duration) && (clearTimeout(timer), resolve(v.duration))
        v.currentTime = 1e9
      }
      v.onerror = () => (clearTimeout(timer), resolve(null))
    })
    URL.revokeObjectURL(url)
    return duration
  } catch {
    return null
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** "palit 2026-10-22 14-05-09" — base dos nomes de arquivo de uma tomada. */
export function takeName(slug: string, d = new Date()) {
  return `${slug} ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`
}

export function extensionFor(mime: string) {
  if (mime.startsWith('video/mp4')) return 'mp4'
  if (mime.startsWith('audio/mp4')) return 'm4a'
  if (mime.startsWith('audio/')) return mime.includes('ogg') ? 'ogg' : 'webm'
  return 'webm'
}
