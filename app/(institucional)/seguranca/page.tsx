import { LegalNotice, LegalSection, LegalTitle } from "@/components/common/legal";

export const metadata = { title: "Segurança em encontros presenciais" };

export default function SegurancaPage() {
  return (
    <>
      <LegalTitle updated="18/09/2026">Segurança em encontros presenciais</LegalTitle>

      <LegalNotice>
        🔒 Nunca divulgue seu endereço residencial na plataforma. Para rolês, use pontos públicos e movimentados
        (postos, cafés, praças) como ponto de encontro.
      </LegalNotice>

      <LegalSection title="Antes de ir">
        <ul>
          <li>Converse pelo chat do rolê e confira o perfil da organizadora e das participantes.</li>
          <li>Avise uma pessoa de confiança: onde vai, com quem e a que horas pretende voltar.</li>
          <li>Prefira rolês em grupo e, no primeiro encontro, escolha horários de dia.</li>
          <li>Revise a moto: pneus, freios, óleo, combustível. Leve documentos, carregador e dinheiro para emergências.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Durante o rolê">
        <ul>
          <li>Use capacete, luvas, jaqueta e calçado fechado — sempre.</li>
          <li>Combine antes o ritmo do grupo, as paradas e o que fazer se alguém precisar sair do comboio.</li>
          <li>Não pilote após ingerir álcool. Não aceite pressão para andar acima do seu nível.</li>
          <li>Confie na sua intuição: se algo parecer errado, você pode ir embora a qualquer momento.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Sinais de alerta">
        <ul>
          <li>Pedidos de dinheiro, transferência ou dados bancários.</li>
          <li>Insistência em mudar o encontro para um local isolado ou para a casa de alguém.</li>
          <li>Perguntas repetidas sobre onde você mora ou onde guarda a moto.</li>
        </ul>
        <p>
          Use os botões <strong>Bloquear</strong> e <strong>Denunciar</strong> nos perfis, mensagens, grupos e rolês.
        </p>
      </LegalSection>

      <LegalSection title="Em caso de emergência">
        <p>
          Ligue para o <strong>190</strong> (Polícia), <strong>192</strong> (SAMU) ou <strong>180</strong> (Central de
          Atendimento à Mulher). A plataforma não substitui os serviços de emergência.
        </p>
      </LegalSection>
    </>
  );
}
