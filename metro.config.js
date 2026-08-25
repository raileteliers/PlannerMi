const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)

// `inlineRem: false` keeps `rem` a runtime observable instead of baking it in
// at build time, which is what lets src/design/typeScale.ts resize the whole
// type scale on small screens.
module.exports = withNativeWind(config, { input: './global.css', inlineRem: false })
