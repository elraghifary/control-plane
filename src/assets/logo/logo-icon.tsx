import * as React from "react";

/**
 * Placeholder logo mark. Replace with your own brand SVG.
 * Stub created because notch-navbar imports `@/assets/logo/logo-icon`
 * (a VengeanceUI site asset not included in the registry).
 */
export default function LogoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Zm0 2.3 6.5 3.6L12 11.5 5.5 7.9 12 4.3Z" />
    </svg>
  );
}
