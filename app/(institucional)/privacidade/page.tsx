import { LegalNotice, LegalSection, LegalTitle } from "@/components/common/legal";

export const metadata = { title: "Política de Privacidade" };

export default function PrivacidadePage() {
  return (
    <>
      <LegalTitle updated="18/09/2026">Política de Privacidade</LegalTitle>
      <LegalNotice>
        Texto-modelo estruturado segundo a LGPD (Lei 13.709/2018). Deve ser revisado por profissional jurídico e
        completado com a identificação da controladora e do encarregado (DPO).
      </LegalNotice>

      <LegalSection title="1. Dados que tratamos">
        <ul>
          <li><strong>Conta e perfil:</strong> e-mail, nome de exibição, foto, bio, cidade e estado.</li>
          <li><strong>Uso da comunidade:</strong> rolês, participações, grupos, mensagens (texto e imagens), bloqueios e denúncias.</li>
          <li><strong>Segurança:</strong> registros de moderação e notificações.</li>
        </ul>
        <p>
          Não coletamos localização exata nem endereço. Mostramos publicamente apenas <strong>cidade e estado</strong>. O
          ponto de encontro de um rolê só é visível à organizadora e às participantes confirmadas.
        </p>
      </LegalSection>

      <LegalSection title="2. Para que usamos">
        <ul>
          <li>Operar a comunidade (perfis, grupos, rolês e conversas) — execução do serviço.</li>
          <li>Garantir a segurança das usuárias e moderar denúncias — legítimo interesse e proteção da vida/incolumidade.</li>
          <li>Cumprir obrigações legais e exercer direitos em processos.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Com quem compartilhamos">
        <p>
          Não vendemos dados. Usamos provedores de infraestrutura (banco de dados, autenticação e armazenamento) que
          tratam dados em nosso nome. Outras usuárias veem apenas o que você escolhe publicar.
        </p>
      </LegalSection>

      <LegalSection title="4. Seus direitos (LGPD, art. 18)">
        <ul>
          <li><strong>Acesso:</strong> baixe seus dados em <em>Perfil → Meus dados e privacidade</em>.</li>
          <li><strong>Correção:</strong> edite nome, cidade, estado e bio na mesma tela.</li>
          <li><strong>Eliminação:</strong> exclua a conta — o perfil é anonimizado e as mensagens são apagadas.</li>
          <li><strong>Informação e revogação:</strong> fale com o encarregado pelo canal de contato oficial.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Retenção">
        <p>
          Mantemos seus dados enquanto a conta estiver ativa. Após a exclusão, ficam retidos apenas registros de
          denúncias e de moderação, sem identificação direta, pelo tempo necessário à segurança da comunidade e ao
          exercício regular de direitos. Contas banidas podem ter dados mantidos para impedir novo abuso.
        </p>
      </LegalSection>

      <LegalSection title="6. Segurança">
        <p>
          Aplicamos controle de acesso por linha no banco de dados: mensagens só podem ser lidas por quem faz parte da
          conversa, e imagens de chat ficam em armazenamento privado com links temporários.
        </p>
      </LegalSection>

      <LegalSection title="7. Parceiros e métricas comerciais">
        <ul>
          <li>Lojas parceiras têm conta separada e <strong>não</strong> acessam grupos, rolês, conversas nem dados de motoqueiras.</li>
          <li>
            Ao clicar em produtos, WhatsApp ou site de um parceiro, registramos apenas o tipo do clique, a loja e a hora —{" "}
            <strong>sem identificar você</strong>. O parceiro vê somente totais.
          </li>
          <li>Ao abrir o WhatsApp ou o site do parceiro, você passa a estar sujeita à política daquele serviço.</li>
          <li>Dados do parceiro (razão social, CNPJ, responsável, contato) ficam visíveis apenas para ele e para a administração.</li>
        </ul>
      </LegalSection>
    </>
  );
}
