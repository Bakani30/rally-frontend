import Svg, { Path } from 'react-native-svg'

type RallyBoltIconProps = {
  color: string
  size?: number
}

/**
 * Rally's lightning mark, traced from the supplied Rally UI icon asset.
 * Keep this as SVG code instead of importing the source SVG: Metro is not
 * configured with an SVG transformer and the icon needs theme-aware colour.
 */
export function RallyBoltIcon({ color, size = 20 }: RallyBoltIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 21" fill="none" accessibilityElementsHidden>
      <Path
        d="M15.9105 9.3138C15.8449 9.18665 15.7137 9.10462 15.5742 9.10462H9.97147L11.891 0.458528C11.932 0.282161 11.8418 0.105794 11.6777 0.0319658C11.5137 -0.0418623 11.3209 0.00735644 11.2142 0.155013L3.12186 11.2867C3.03983 11.4015 3.02752 11.5533 3.08905 11.6804C3.15467 11.8076 3.28592 11.8896 3.42538 11.8896H9.02401L7.10448 20.5357C7.06346 20.712 7.1537 20.8884 7.31776 20.9622C7.36698 20.9868 7.4203 20.9951 7.47362 20.9951C7.59256 20.9951 7.70741 20.9376 7.78123 20.8392L15.8777 9.70755C15.9639 9.59681 15.9762 9.44095 15.9105 9.3138Z"
        fill={color}
      />
    </Svg>
  )
}
