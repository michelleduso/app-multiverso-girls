import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function UserAvatar({
  name,
  src,
  size = "default",
  className,
}: {
  name: string | null | undefined;
  src?: string | null;
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  const initial = (name?.trim()[0] ?? "?").toUpperCase();
  return (
    <Avatar size={size} className={className}>
      {src ? <AvatarImage src={src} alt="" /> : null}
      <AvatarFallback>{initial}</AvatarFallback>
    </Avatar>
  );
}
