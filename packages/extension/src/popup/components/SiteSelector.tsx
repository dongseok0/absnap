import type { Site } from '../../shared/types'

interface Props {
  sites: Site[]
  activeSite: Site | null
  onChange(site: Site): void
}

export default function SiteSelector({ sites, activeSite, onChange }: Props) {
  if (sites.length === 0) return null
  return (
    <select
      value={activeSite?.id ?? ''}
      onChange={(e) => {
        const site = sites.find((s) => s.id === e.target.value)
        if (site) onChange(site)
      }}
      className="text-sm border border-gray-200 rounded px-2 py-1 text-gray-700 bg-white max-w-[140px] truncate"
    >
      {sites.map((s) => (
        <option key={s.id} value={s.id}>{s.name}</option>
      ))}
    </select>
  )
}
