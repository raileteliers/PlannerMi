import Svg, { Path } from 'react-native-svg'
import { TOKENS } from '../design/tokens'

/**
 * The only mark that says "there is more under this". Down when folded, up
 * when open — a rotation would need an animation to read as one, and this is
 * two line segments either way.
 */
export function Caret({ abierto }: { abierto: boolean }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
      <Path
        d={abierto ? 'M2.5 7.5L6 4l3.5 3.5' : 'M2.5 4.5L6 8l3.5-3.5'}
        stroke={TOKENS.inkTertiary}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}
