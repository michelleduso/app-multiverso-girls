import { LegalNotice, LegalSection, LegalTitle } from "@/components/common/legal";

export const metadata = { title: "Regras da comunidade" };

export default function RegrasPage() {
  return (
    <>
      <LegalTitle updated="18/09/2026">Regras da comunidade</LegalTitle>
      <p className="text-sm text-foreground/85">
        O Multiverso Girls é um espaço de motoqueiras, feito para criar amizade, apoio e rolês seguros. Estas regras valem
        para perfis, mensagens, grupos e rolês.
      </p>

      <LegalNotice>
        🔒 Nunca divulgue endereço residencial — seu ou de outra pessoa — em perfil, chat, grupo ou descrição de rolê.
        O ponto de encontro de um rolê só é informado às participantes confirmadas.
      </LegalNotice>

      <LegalSection title="1. Respeito acima de tudo">
        <ul>
          <li>Trate todas com respeito. Não toleramos assédio, ameaças, humilhação ou perseguição.</li>
          <li>Não há espaço para discriminação de qualquer tipo (raça, orientação, corpo, idade, classe, tipo de moto).</li>
          <li>Iniciantes são bem-vindas: sem julgamentos sobre nível de pilotagem ou modelo de moto.</li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Perfil verdadeiro">
        <ul>
          <li>Use seus dados reais. Perfis falsos ou que se passem por outra pessoa são removidos.</li>
          <li>Não compartilhe dados pessoais de terceiras (telefone, endereço, fotos) sem autorização.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Segurança em primeiro lugar">
        <ul>
          <li>Não incentive pilotagem perigosa, racha ou excesso de velocidade.</li>
          <li>Rolês devem respeitar a lei de trânsito e o uso de equipamentos de segurança.</li>
          <li>Confira as <a href="/seguranca" className="text-primary underline">orientações para encontros presenciais</a>.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Sem golpes e sem spam">
        <ul>
          <li>Não é permitido pedir dinheiro, vender produtos ou divulgar links suspeitos nas conversas.</li>
          <li>Não há pagamentos dentro do app. Desconfie de qualquer pedido de transferência.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Denúncia e moderação">
        <ul>
          <li>Você pode denunciar perfis, mensagens, grupos, rolês e comportamentos, e bloquear qualquer pessoa.</li>
          <li>
            A equipe analisa cada denúncia e pode ignorar, advertir, remover conteúdo, suspender temporariamente ou
            banir permanentemente. Toda ação fica registrada.
          </li>
          <li>Administradoras de grupo podem remover mensagens inadequadas e membros do próprio grupo.</li>
        </ul>
      </LegalSection>
    </>
  );
}
