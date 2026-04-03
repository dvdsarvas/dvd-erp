interface PageHeaderProps {
  naslov: string
  opis?: string
  akcije?: React.ReactNode
}

export function PageHeader({ naslov, opis, akcije }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-white">{naslov}</h1>
        {opis && <p className="text-sm text-[#777] mt-0.5">{opis}</p>}
      </div>
      {akcije && <div className="flex items-center gap-2">{akcije}</div>}
    </div>
  )
}
