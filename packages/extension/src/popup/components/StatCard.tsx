interface Props {
  label: string
  rate: number
  count: number
  isVariant?: boolean
  lift?: number
}

export default function StatCard({ label, rate, count, isVariant, lift }: Props) {
  return (
    <div className="flex-1 text-center">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-base font-semibold text-gray-900">
        {(rate * 100).toFixed(1)}%
        {isVariant && lift !== undefined && lift !== 0 && (
          <span className={`ml-1 text-xs ${lift > 0 ? 'text-green-600' : 'text-red-500'}`}>
            {lift > 0 ? '+' : ''}{(lift * 100).toFixed(0)}%
          </span>
        )}
      </div>
      <div className="text-xs text-gray-400">{count.toLocaleString()}명</div>
    </div>
  )
}
