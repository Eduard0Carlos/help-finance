import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  gradient?: boolean;
}

export function Card({ children, className, gradient = false, ...rest }: CardProps) {
  return (
    <div
      {...rest}
      className={cn(
        "rounded-xl p-4",
        gradient
          ? "bg-gradient-to-br from-[rgba(0,212,170,0.07)] to-[rgba(0,212,170,0.02)] border border-[rgba(0,212,170,0.18)]"
          : "bg-[#141420] border border-[#2a2a3e]",
        className
      )}
    >
      {children}
    </div>
  );
}
