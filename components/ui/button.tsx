import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        {
          "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500": variant === "primary",
          "bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-400": variant === "secondary",
          "border border-gray-300 bg-transparent hover:bg-gray-50 focus-visible:ring-gray-400": variant === "outline",
          "hover:bg-gray-100 focus-visible:ring-gray-400": variant === "ghost",
          "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500": variant === "destructive",
        },
        {
          "h-8 px-3 text-sm": size === "sm",
          "h-10 px-4 text-sm": size === "md",
          "h-11 px-6 text-base": size === "lg",
        },
        className
      )}
      {...props}
    />
  );
}
