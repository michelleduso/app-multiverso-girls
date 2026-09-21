import { LegalNotice, LegalSection, LegalTitle } from "@/components/common/legal";

export const metadata = { title: "Termos de Uso" };

export default function TermosPage() {
  return (
    <>
      <LegalTitle updated="18/09/2026">Termos de Uso</LegalTitle>
      <LegalNotice>
        Texto-modelo. Deve ser revisado por profissional jurídico antes do lançamento, com a identificação da
        responsável pela plataforma e o canal de contato oficial.
      </LegalNotice>

      <LegalSection title="1. Sobre o Multiverso Girls">
        <p>
          O Multiverso Girls é uma comunidade online para motoqueiras se conhecerem, formarem grupos e combinarem rolês. A
          plataforma apenas conecta pessoas: não organiza, não fiscaliza e não se responsabiliza pelos encontros
          presenciais.
        </p>
      </LegalSection>

      <LegalSection title="2. Cadastro e aprovação">
        <ul>
          <li>O acesso é restrito a mulheres motoqueiras e depende de aprovação do perfil pela equipe.</li>
          <li>Você declara que as informações fornecidas são verdadeiras e que tem 18 anos ou mais.</li>
          <li>Você é responsável por manter sua senha em sigilo.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Conduta">
        <p>
          Ao usar a plataforma, você aceita as <a href="/regras" className="text-primary underline">Regras da comunidade</a>.
          O descumprimento pode levar a advertência, remoção de conteúdo, suspensão temporária ou banimento.
        </p>
      </LegalSection>

      <LegalSection title="4. Conteúdo publicado">
        <ul>
          <li>Você continua titular do que publica e nos autoriza a exibi-lo na plataforma para as demais usuárias.</li>
          <li>Você se compromete a não publicar conteúdo ilegal, ofensivo ou que viole direitos de terceiras.</li>
          <li>Podemos remover conteúdo que viole estes Termos ou as Regras.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Encontros presenciais">
        <p>
          Rolês e encontros são de responsabilidade das participantes. Leia as{" "}
          <a href="/seguranca" className="text-primary underline">orientações de segurança</a>. Nunca divulgue endereço
          residencial na plataforma.
        </p>
      </LegalSection>

      <LegalSection title="6. Sem pagamentos">
        <p>Não há pagamentos dentro do app. Desconfie de pedidos de dinheiro feitos em nome da plataforma.</p>
      </LegalSection>

      <LegalSection title="7. Encerramento da conta">
        <p>
          Você pode excluir sua conta a qualquer momento em <em>Perfil → Meus dados e privacidade</em>. Podemos suspender
          ou banir contas que violem estes Termos.
        </p>
      </LegalSection>

      <LegalSection title="8. Alterações">
        <p>Podemos atualizar estes Termos; mudanças relevantes serão comunicadas no app.</p>
      </LegalSection>

      <LegalSection title="9. Parceiros e anúncios">
        <ul>
          <li>Conteúdo de lojas aparece sempre identificado como “Parceiro” ou “Patrocinado”.</li>
          <li>O Multiverso Girls é apenas vitrine: não vende, não recebe pagamentos e não garante produtos, preços ou serviços dos parceiros.</li>
          <li>Negociações acontecem diretamente com a loja, fora da plataforma.</li>
          <li>A conta de parceiro é separada da comunidade e pode ser suspensa por violar estes Termos.</li>
        </ul>
      </LegalSection>
    </>
  );
}
