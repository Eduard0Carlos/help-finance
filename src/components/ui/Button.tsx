import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "font-semibold rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed",
        {
          "bg-[#00d4aa] text-[#0d0d0d] hover:bg-[#00e8bb]": variant === "primary",
          "bg-[#2a2a3e] text-white hover:bg-[#3a3a5e]": variant === "secondary",
          "text-[#9ca3af] hover:text-white hover:bg-[#1a1a2e]": variant === "ghost",
          "bg-red-500/10 text-red-400 hover:bg-red-500/20": variant === "danger",
        },
        {
          "text-xs px-3 py-1.5": size === "sm",
          "text-sm px-4 py-2": size === "md",
          "text-base px-6 py-3": size === "lg",
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
