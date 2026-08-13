import { Pressable, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { TOKENS } from '../design/tokens'

/**
 * React Native has no checkbox, so this is one: a 16px box inside a 44px
 * target, checked in the neutral accent because a tick is not data.
 */
export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={() => onChange(!checked)}
      className="h-11 w-11 items-center justify-center"
    >
      <View
        className="h-4 w-4 items-center justify-center rounded-[3px] border"
        style={{
          borderColor: checked ? TOKENS.accent : TOKENS.borderStrong,
          backgroundColor: checked ? TOKENS.accent : 'transparent',
        }}
      >
        {checked && (
          <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
            <Path
              d="M2.5 6.2l2.4 2.4 4.6-5"
              stroke={TOKENS.onAccent}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        )}
      </View>
    </Pressable>
  )
}
