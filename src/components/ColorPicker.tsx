import { Pressable, View } from 'react-native'
import { COURSE_COLORS, courseColor, type ColorToken } from '../design/palette'
import { TOKENS } from '../design/tokens'

/** The closed palette as a row of dots. 44px targets, 20px dots when chosen. */
export function ColorPicker({
  value,
  onChange,
  label = 'Color del ramo',
}: {
  value: ColorToken
  onChange: (color: ColorToken) => void
  label?: string
}) {
  return (
    <View className="flex-row" accessibilityRole="radiogroup" accessibilityLabel={label}>
      {COURSE_COLORS.map((color) => {
        const elegido = color === value
        return (
          <Pressable
            key={color}
            accessibilityRole="radio"
            accessibilityState={{ checked: elegido }}
            accessibilityLabel={color}
            onPress={() => onChange(color)}
            className="h-11 w-11 items-center justify-center"
          >
            <View
              className="rounded-full"
              style={{
                backgroundColor: courseColor(color),
                width: elegido ? 20 : 14,
                height: elegido ? 20 : 14,
                // RN has no outline-offset: a ring is a border on a wrapper,
                // so the chosen dot grows instead and takes a hairline ring.
                borderWidth: elegido ? 2 : 0,
                borderColor: TOKENS.ink,
              }}
            />
          </Pressable>
        )
      })}
    </View>
  )
}
