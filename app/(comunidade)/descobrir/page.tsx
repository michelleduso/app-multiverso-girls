import { Compass } from "lucide-react";
import { PlaceholderScreen } from "@/components/layout/placeholder-screen";

export default function DescobrirPage() {
  return (
    <PlaceholderScreen
      icon={<Compass className="size-8 text-primary" />}
      title="Motoqueiras perto de você"
      description="A busca por cidade, tipo de moto e estilo de rolê chega na próxima etapa da construção do app."
    />
  );
}
