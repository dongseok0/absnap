import { getConfidenceLevel, confidenceLabel } from '../../shared/stats'

interface Props {
  confidence: number
}

export default function ConfidenceBadge({ confidence }: Props) {
  const level = getConfidenceLevel(confidence)
  return (
    <span className="text-xs text-gray-500">
      신뢰도: {(confidence * 100).toFixed(0)}% {confidenceLabel(level)}
    </span>
  )
}
