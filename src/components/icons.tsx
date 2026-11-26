import type { SVGProps } from 'react'
import { useId } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Icon({ size = 18, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export function SunIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </Icon>
  )
}

export function MoonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z" />
    </Icon>
  )
}

export function BookOpenIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 6.5c-1.7-1.3-4-2-7-1.7v12.8c3-.3 5.3.4 7 1.7 1.7-1.3 4-2 7-1.7V4.8c-3-.3-5.3.4-7 1.7Z" />
      <path d="M12 6.5v12.8" />
      <path d="M16 7.2h2.2M16 10.2h2.2M16 13.2h2.2" />
    </Icon>
  )
}

export function BookmarkIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6.8 4.3c.2-.8.9-1.3 1.7-1.3h7c.8 0 1.5.5 1.7 1.3.2.6.3 1.4.3 2.4v14l-5.5-3.6L6.5 20.7v-14c0-1 .1-1.8.3-2.4Z" />
    </Icon>
  )
}

export function BookmarkFilledIcon({ size = 18, ...props }: IconProps) {
  return (
    <Icon size={size} fill="currentColor" {...props}>
      <path d="M6.8 4.3c.2-.8.9-1.3 1.7-1.3h7c.8 0 1.5.5 1.7 1.3.2.6.3 1.4.3 2.4v14l-5.5-3.6L6.5 20.7v-14c0-1 .1-1.8.3-2.4Z" />
    </Icon>
  )
}

export function XIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Icon>
  )
}

export function MinusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12h14" />
    </Icon>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  )
}

export function ArrowUpRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 17 17 7M8 7h9v9" />
    </Icon>
  )
}

export function TrashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h16M9 7V5.2c0-.7.5-1.2 1.2-1.2h3.6c.7 0 1.2.5 1.2 1.2V7M6.5 7l.8 11.6c.1.8.7 1.4 1.5 1.4h6.4c.8 0 1.4-.6 1.5-1.4L17.5 7" />
      <path d="M10 11v5M14 11v5" />
    </Icon>
  )
}

export function LockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5" y="10" width="14" height="10" rx="2.5" />
      <path d="M8.5 10V7.5a3.5 3.5 0 1 1 7 0V10" />
    </Icon>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </Icon>
  )
}

export function LibraryIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 5.5C4 4.7 4.7 4 5.5 4H8v16H5.5c-.8 0-1.5-.7-1.5-1.5v-13Z" />
      <path d="M8 4h4.5v16H8z" />
      <path d="m13.7 5.2 2.9-.8a1.3 1.3 0 0 1 1.6.9l3.1 11.9a1.3 1.3 0 0 1-.9 1.6l-2.9.8a1.3 1.3 0 0 1-1.6-.9L12.8 6.8a1.3 1.3 0 0 1 .9-1.6Z" />
    </Icon>
  )
}

export function InfoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.6v.1" />
    </Icon>
  )
}

export function LogoMark({ size = 32 }: { size?: number }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      aria-hidden="true"
      className="blogit-logo-mark"
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="18" y1="10" x2="110" y2="122" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D5784F" />
          <stop offset="1" stopColor="#98401F" />
        </linearGradient>
        <linearGradient id={`${id}-page`} x1="64" y1="43" x2="93" y2="87" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FBF1DE" />
          <stop offset="1" stopColor="#EEDCC0" />
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="29" fill={`url(#${id}-bg)`} />
      <path d="M0 98c21-9 43-11 64-4s43 9 64 0v34H0V98Z" fill="#3A1709" fillOpacity=".14" />
      <path
        d="M64 43c-8-5-17-7.2-26-4.7-2 .6-3 2-3 4.1v37.3c0 2.6 2.1 4.2 4.4 3.4 7.9-2.6 16.7-1.4 24.6 3.7V43Z"
        fill="#FDF7EA"
      />
      <path
        d="M64 43c8-5 17-7.2 26-4.7 2 .6 3 2 3 4.1v37.3c0 2.6-2.1 4.2-4.4 3.4-7.9-2.6-16.7-1.4-24.6 3.7V43Z"
        fill={`url(#${id}-page)`}
      />
      <path d="M64 43v43.8" stroke="#B5562F" strokeOpacity=".4" strokeWidth="2" />
      <path d="M77.5 40.5v15.8l4.8-2.7 4.7 2.7V39.6c-3.3-.2-6.5.3-9.5 1.7Z" fill="#B5562F" />
    </svg>
  )
}
