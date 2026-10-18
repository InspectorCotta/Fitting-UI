/** TO-220 power MOSFET with a mounting tab and three leads. */
export function MosfetMark() {
  return (
    <svg
      className="mosfet-mark"
      viewBox="0 0 36 36"
      width="32"
      height="32"
      fill="none"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className="mosfet-terminals"
        fillRule="evenodd"
        d="M12 2H24L26 4V15H10V4ZM20.5 7A2.5 2.5 0 1 0 15.5 7A2.5 2.5 0 1 0 20.5 7Z"
      />
      <g className="mosfet-terminals">
        {[16.6, 23.2].map((x) => (
          <rect key={x} x={x} y="23" width="2.8" height="11" rx=".6" />
        ))}
      </g>
      <rect className="mosfet-gate" x="10" y="23" width="2.8" height="11" rx=".6" />
      <path className="mosfet-body" d="M8 14L10 12H26L28 14V25H8Z" />
      <path className="mosfet-bevel" d="M8 14H26L28 14M26 14V25" />
      <path className="mosfet-accent" d="M13 22H23" />
      <text
        className="mosfet-label"
        x="18"
        y="19.5"
        textAnchor="middle"
        fontFamily="Inter, Segoe UI, sans-serif"
        fontSize="4.2"
        fontWeight="600"
        letterSpacing=".35"
      >
        TO220
      </text>
    </svg>
  );
}
