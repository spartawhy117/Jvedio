export type AppIconName =
  | "brand"
  | "settings"
  | "library-management"
  | "favorites"
  | "actors"
  | "library"
  | "refresh"
  | "sort"
  | "detail"
  | "play"
  | "folder"
  | "favorite"
  | "favorite-off"
  | "rescrape"
  | "copy"
  | "delete"
  | "running"
  | "queued"
  | "completed"
  | "failed"
  | "status"
  | "sync"
  | "cpu"
  | "memory";

interface AppIconProps {
  name: AppIconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

function IconPath({ name }: { name: AppIconName }) {
  switch (name) {
    case "brand":
      return (
        <>
          <path d="M4 6.5h9a3.5 3.5 0 0 1 0 7H4z" />
          <path d="M13 6.5v7" />
          <path d="M17.5 8.5v3" />
          <path d="M20 10h.01" />
        </>
      );
    case "settings":
      return (
        <>
          <circle cx="12" cy="12" r="3.25" />
          <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 0 1-4 0v-.1a1 1 0 0 0-.7-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 0 1 0-4h.1a1 1 0 0 0 .9-.7 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 0 1 4 0v.1a1 1 0 0 0 .7.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.1a2 2 0 0 1 0 4h-.1a1 1 0 0 0-.9.7Z" />
        </>
      );
    case "library-management":
      return (
        <>
          <path d="M3.5 7.5h7l1.4 1.8H20a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 20 19.3H4a1.5 1.5 0 0 1-1.5-1.5z" />
          <path d="M8 13h8" />
        </>
      );
    case "favorites":
    case "favorite":
      return <path d="m12 20.5-1.2-1.1C5.2 14.3 2 11.4 2 7.8 2 5 4.2 2.8 7 2.8c1.7 0 3.3.8 4.3 2.1 1-1.3 2.6-2.1 4.3-2.1 2.8 0 5 2.2 5 5 0 3.6-3.2 6.5-8.8 11.6z" />;
    case "favorite-off":
      return (
        <>
          <path d="m12 20.5-1.2-1.1C5.2 14.3 2 11.4 2 7.8 2 5 4.2 2.8 7 2.8c1.7 0 3.3.8 4.3 2.1 1-1.3 2.6-2.1 4.3-2.1 2.8 0 5 2.2 5 5 0 3.6-3.2 6.5-8.8 11.6z" />
          <path d="M5 5l14 14" />
        </>
      );
    case "actors":
      return (
        <>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5 19.2a7 7 0 0 1 14 0" />
        </>
      );
    case "library":
      return (
        <>
          <path d="M5 4.5h4v15H5z" />
          <path d="M10 4.5h4v15h-4z" />
          <path d="M15 7h4v12h-4z" />
        </>
      );
    case "refresh":
      return (
        <>
          <path d="M20 7v5h-5" />
          <path d="M4 17v-5h5" />
          <path d="M7.5 9A7 7 0 0 1 20 12" />
          <path d="M16.5 15A7 7 0 0 1 4 12" />
        </>
      );
    case "sort":
      return (
        <>
          <path d="M7 6h10" />
          <path d="M9 12h8" />
          <path d="M11 18h6" />
        </>
      );
    case "detail":
      return (
        <>
          <rect x="5" y="4.5" width="14" height="15" rx="2" />
          <path d="M8.5 9h7" />
          <path d="M8.5 13h7" />
          <path d="M8.5 17h4" />
        </>
      );
    case "play":
      return <path d="M8 6.5v11l8.5-5.5z" fill="currentColor" stroke="none" />;
    case "folder":
      return (
        <>
          <path d="M3.5 8h6l1.8 2H20a1.5 1.5 0 0 1 1.5 1.5v5.5A1.5 1.5 0 0 1 20 18.5H4A1.5 1.5 0 0 1 2.5 17V9.5A1.5 1.5 0 0 1 4 8z" />
        </>
      );
    case "rescrape":
    case "sync":
      return (
        <>
          <path d="M6 8.5A7.5 7.5 0 0 1 18.6 6L20 7.4" />
          <path d="M18 15.5A7.5 7.5 0 0 1 5.4 18L4 16.6" />
          <path d="M16 7h4v4" />
          <path d="M8 17H4v-4" />
        </>
      );
    case "copy":
      return (
        <>
          <rect x="8" y="8" width="10" height="11" rx="2" />
          <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
        </>
      );
    case "delete":
      return (
        <>
          <path d="M5.5 7h13" />
          <path d="M9 10.5v6" />
          <path d="M15 10.5v6" />
          <path d="M7.5 7l.7 11a1.5 1.5 0 0 0 1.5 1.4h4.6a1.5 1.5 0 0 0 1.5-1.4L16.5 7" />
          <path d="M9 4.5h6l.8 2.5H8.2z" />
        </>
      );
    case "running":
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l3 2" />
        </>
      );
    case "queued":
      return (
        <>
          <path d="M5 7h14" />
          <path d="M5 12h10" />
          <path d="M5 17h7" />
        </>
      );
    case "completed":
      return (
        <>
          <path d="m5 12 4.2 4.2L19 6.5" />
        </>
      );
    case "failed":
      return (
        <>
          <path d="M7 7l10 10" />
          <path d="M17 7 7 17" />
        </>
      );
    case "status":
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
        </>
      );
    case "cpu":
      return (
        <>
          <rect x="7" y="7" width="10" height="10" rx="1.8" />
          <path d="M12 3.5v2" />
          <path d="M12 18.5v2" />
          <path d="M3.5 12h2" />
          <path d="M18.5 12h2" />
          <path d="M7 12h10" />
        </>
      );
    case "memory":
      return (
        <>
          <path d="M6 7.5h12v9H6z" />
          <path d="M9 7.5v-2" />
          <path d="M15 7.5v-2" />
          <path d="M9 16.5v2" />
          <path d="M15 16.5v2" />
        </>
      );
  }
}

export function AppIcon({
  name,
  size = 16,
  className,
  strokeWidth = 1.8,
}: AppIconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <IconPath name={name} />
    </svg>
  );
}
