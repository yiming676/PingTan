import type { CSSProperties, ReactNode } from 'react'

interface IconProps {
  name: string
  className?: string
  style?: CSSProperties
  title?: string
}

const iconPaths: Record<string, ReactNode> = {
  ac_unit: (
    <>
      <path d="M12 3v18" />
      <path d="M5 7l14 10" />
      <path d="M19 7L5 17" />
      <path d="M8 4l4 4 4-4" />
      <path d="M8 20l4-4 4 4" />
    </>
  ),
  add_circle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </>
  ),
  admin_panel_settings: (
    <>
      <path d="M12 3l7 3v5c0 4.5-2.7 8.4-7 10-4.3-1.6-7-5.5-7-10V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  arrow_back: <path d="M19 12H5m6-6-6 6 6 6" />,
  arrow_forward: <path d="M5 12h14m-6-6 6 6-6 6" />,
  build_circle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.8 8.2a3 3 0 0 0-3.7 3.7l-3.8 3.8 2 2 3.8-3.8a3 3 0 0 0 3.7-3.7l-2 2-2-2 2-2z" />
    </>
  ),
  campaign: (
    <>
      <path d="M4 11v2a2 2 0 0 0 2 2h2l5 4V5L8 9H6a2 2 0 0 0-2 2z" />
      <path d="M17 9a4 4 0 0 1 0 6" />
      <path d="M19.5 6.5a8 8 0 0 1 0 11" />
    </>
  ),
  check_circle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9" />
    </>
  ),
  chevron_left: <path d="M15 18l-6-6 6-6" />,
  chevron_right: <path d="M9 6l6 6-6 6" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  construction: (
    <>
      <path d="M5 20h14" />
      <path d="M7 20l5-12 5 12" />
      <path d="M9 15h6" />
      <path d="M10 11h4" />
    </>
  ),
  dark_mode: <path d="M20 15.5A8 8 0 0 1 8.5 4 8.8 8.8 0 1 0 20 15.5z" />,
  delete: (
    <>
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 14h10l1-14" />
      <path d="M9 7V4h6v3" />
    </>
  ),
  description: (
    <>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v5h5" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4l11-11-4-4L4 16v4z" />
      <path d="M13 7l4 4" />
    </>
  ),
  error: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6" />
      <path d="M12 17h.01" />
    </>
  ),
  expand_more: <path d="M6 9l6 6 6-6" />,
  expand_less: <path d="M6 15l6-6 6 6" />,
  group: (
    <>
      <path d="M16 11a4 4 0 1 0-8 0" />
      <path d="M4 21a8 8 0 0 1 16 0" />
      <path d="M18 8a3 3 0 0 1 2 5" />
    </>
  ),
  home: (
    <>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </>
  ),
  home_repair_service: (
    <>
      <path d="M4 10h16v10H4z" />
      <path d="M9 10V7a3 3 0 0 1 6 0v3" />
      <path d="M8 15h8" />
    </>
  ),
  history: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  how_to_reg: (
    <>
      <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
      <path d="M3 21a6 6 0 0 1 12 0" />
      <path d="M16 13l2 2 4-5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6" />
      <path d="M12 7h.01" />
    </>
  ),
  location_on: (
    <>
      <path d="M12 21s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  logout: <path d="M10 17l5-5-5-5M15 12H3M21 4v16h-7" />,
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M4 7l8 6 8-6" />
    </>
  ),
  more_horiz: (
    <>
      <circle cx="6" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="18" cy="12" r="1.5" />
    </>
  ),
  notifications: (
    <>
      <path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 2h16z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  notifications_off: (
    <>
      <path d="M18 16v-5a6 6 0 0 0-8.5-5.4" />
      <path d="M6 11v5l-2 2h14" />
      <path d="M3 3l18 18" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  phone: (
    <>
      <path d="M7 4h10v16H7z" />
      <path d="M11 17h2" />
    </>
  ),
  photo_camera: (
    <>
      <path d="M4 8h4l2-3h4l2 3h4v11H4z" />
      <circle cx="12" cy="13" r="4" />
    </>
  ),
  progress_activity: (
    <>
      <path d="M21 12a9 9 0 0 1-9 9" />
      <path d="M12 3a9 9 0 0 1 9 9" />
    </>
  ),
  restaurant: (
    <>
      <path d="M7 3v18" />
      <path d="M4 3v5a3 3 0 0 0 6 0V3" />
      <path d="M17 3v18" />
      <path d="M17 3c2 2 3 4 3 7v1h-3" />
    </>
  ),
  restaurant_menu: (
    <>
      <path d="M5 4h14v16H5z" />
      <path d="M8 8h8" />
      <path d="M8 12h8" />
      <path d="M8 16h5" />
    </>
  ),
  router: (
    <>
      <rect x="4" y="12" width="16" height="7" rx="2" />
      <path d="M8 12V8" />
      <path d="M16 12V8" />
      <path d="M9 16h.01" />
      <path d="M13 16h.01" />
    </>
  ),
  school: (
    <>
      <path d="M3 8l9-4 9 4-9 4-9-4z" />
      <path d="M6 10v5c0 2 3 4 6 4s6-2 6-4v-5" />
      <path d="M21 8v6" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M16 16l5 5" />
    </>
  ),
  send: (
    <>
      <path d="M3 11l18-8-8 18-2-7-8-3z" />
      <path d="M21 3l-10 11" />
    </>
  ),
  visibility: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  visibility_off: (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.5 5.2A10.3 10.3 0 0 1 12 5c6 0 10 7 10 7a16 16 0 0 1-3.1 4.1" />
      <path d="M6.6 6.7A16 16 0 0 0 2 12s4 7 10 7a10 10 0 0 0 4-0.8" />
    </>
  ),
  wb_sunny: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
    </>
  ),
  wb_twilight: (
    <>
      <path d="M4 17h16" />
      <path d="M7 14a5 5 0 0 1 10 0" />
      <path d="M12 5v2" />
      <path d="M4 9l2 1" />
      <path d="M20 9l-2 1" />
    </>
  ),
}

export default function Icon({ name, className = '', style, title }: IconProps) {
  const path = iconPaths[name] ?? iconPaths.info

  return (
    <span
      aria-hidden={title ? undefined : true}
      className={`inline-flex shrink-0 items-center justify-center leading-none ${className}`}
      style={style}
      title={title}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-[1em] w-[1em]"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        {path}
      </svg>
    </span>
  )
}
