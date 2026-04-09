import Link from "next/link";

type Props = {
  walletAddress: string;
};

export default function ReportButton({ walletAddress }: Props) {
  const href = `/feedback?type=removal_request&wallet=${encodeURIComponent(walletAddress)}`;

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono uppercase tracking-wider border border-border bg-bg-secondary text-zinc-600 hover:text-red-400 hover:border-red-900/50 transition-all duration-150"
      title="Report this wallet or request removal"
    >
      <svg
        className="w-3 h-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 3h18l-2 9H5L3 3zm0 0L2 1M9 21h6m-3-3v3m-6-9h12"
        />
      </svg>
      Report
    </Link>
  );
}
