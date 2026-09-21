import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PlaceholderScreen({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full">
        <CardHeader className="items-center text-center">
          {icon}
          <CardTitle className="text-balance">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </div>
  );
}
