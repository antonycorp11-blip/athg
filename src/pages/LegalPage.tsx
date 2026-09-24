import { useLocation } from 'react-router'
import { ShieldCheck, ScrollText } from 'lucide-react'
import { useSeo } from '@/hooks/useSeo'
import { PageHeader } from '@/components/layout/PageHeader'
import { site } from '@/config/site'

// Textos legais em pt-BR (versão inicial). Revisar com um profissional antes
// de escalar e sempre que a coleta de dados mudar.
const UPDATED = '24 de setembro de 2026'

const privacy: [string, string[]][] = [
  ['Quem somos', ['A ATHG é uma plataforma de jogos para navegador. Esta política explica quais dados coletamos, por que e quais são os seus direitos, conforme a Lei Geral de Proteção de Dados (LGPD – Lei 13.709/2018).']],
  [
    'O que coletamos',
    [
      'Conta: email e senha (a senha é armazenada de forma criptografada pelo nosso provedor de autenticação; nós não temos acesso a ela). Nome de jogador que você escolher.',
      'Convidado: ao jogar sem conta, criamos um identificador anônimo, sem email ou dados pessoais, para registrar seu progresso.',
      'Atividade na plataforma: jogos acessados, tempo de jogo ativo, favoritos, conquistas, pontuações, saves dos jogos, buscas e cliques em jogos.',
      'Dados técnicos: tipo de aparelho (celular, tablet ou computador) e, quando você reporta um problema, o navegador usado e a página em que estava.',
    ],
  ],
  [
    'Para que usamos',
    [
      'Fazer a plataforma funcionar: salvar progresso, favoritos, conquistas e rankings.',
      'Melhorar a ATHG: entender quais jogos são mais jogados, quanto tempo as pessoas jogam e o que procuram.',
      'Suporte: analisar problemas reportados.',
      'Não vendemos seus dados. Não usamos seus dados para publicidade personalizada.',
    ],
  ],
  [
    'Onde ficam os dados',
    ['Os dados ficam no Supabase (banco de dados e autenticação, servidores em São Paulo) e o site é servido pela Cloudflare. Parte do progresso também fica salva no seu próprio navegador.'],
  ],
  [
    'Rankings',
    ['Nos rankings públicos aparecem apenas seu nome de jogador, avatar, nível e pontuação/minutos. Seu email nunca é exibido.'],
  ],
  [
    'Seus direitos',
    [
      'Você pode acessar, corrigir e excluir seus dados. O nome de jogador pode ser alterado no Perfil.',
      'Excluir conta: no Perfil, use "Excluir minha conta". Isso apaga sua conta e todo o seu progresso de forma definitiva.',
      'Convidados podem apagar os dados do navegador a qualquer momento limpando os dados do site.',
      `Para qualquer pedido sobre seus dados (acesso, correção, exclusão ou dúvidas), escreva para ${site.contactEmail}.`,
    ],
  ],
  ['Menores de idade', ['Se você tem menos de 18 anos, peça a um responsável para ler esta política com você antes de criar uma conta.']],
  ['Mudanças', ['Se esta política mudar, a data abaixo será atualizada e avisaremos na plataforma quando a mudança for relevante.']],
]

const terms: [string, string[]][] = [
  ['Aceite', ['Ao usar a ATHG ou criar uma conta, você concorda com estes termos. Se não concordar, não use a plataforma.']],
  ['O serviço', ['A ATHG oferece jogos para jogar no navegador. Jogar é gratuito e não exige conta. Recursos podem mudar, ser adicionados ou removidos.']],
  [
    'Sua conta',
    [
      'Você é responsável por manter sua senha segura e pelas atividades na sua conta.',
      'Nomes de jogador ofensivos, que imitem outras pessoas ou que violem direitos de terceiros podem ser alterados ou removidos.',
    ],
  ],
  [
    'Regras de uso',
    [
      'Não é permitido trapacear nos rankings, explorar falhas, automatizar partidas ou tentar acessar dados de outras pessoas.',
      'Contas que violarem estas regras podem ter pontuações removidas ou ser suspensas.',
    ],
  ],
  ['Conteúdo', ['Os jogos, marcas e artes da ATHG pertencem aos seus respectivos autores. Não é permitido copiar ou redistribuir os jogos.']],
  ['ATHG Pass', ['O ATHG Pass ainda não está disponível. Quando for lançado, terá condições próprias de assinatura.']],
  ['Garantias', ['A plataforma é oferecida "como está". Fazemos o possível para mantê-la no ar e segura, mas não garantimos funcionamento ininterrupto nem ausência de erros.']],
  ['Mudanças', ['Estes termos podem ser atualizados. A data abaixo indica a versão atual.']],
  ['Contato', [`Dúvidas sobre estes termos: ${site.contactEmail}.`]],
]

export default function LegalPage() {
  const isPrivacy = useLocation().pathname.startsWith('/privacidade')
  const title = isPrivacy ? 'Política de Privacidade' : 'Termos de Uso'
  const sections = isPrivacy ? privacy : terms
  useSeo({ title: `${title} | ATHG`, description: `${title} da plataforma ATHG.`, path: isPrivacy ? '/privacidade' : '/termos' })

  return (
    <article className="max-w-3xl pb-8">
      <PageHeader title={title} icon={isPrivacy ? ShieldCheck : ScrollText} subtitle={`Atualizado em ${UPDATED}`} />
      <div className="space-y-7">
        {sections.map(([heading, paragraphs]) => (
          <section key={heading}>
            <h2 className="font-display text-lg font-bold">{heading}</h2>
            <ul className="mt-2 space-y-2 text-[15px] leading-relaxed text-fg/80">
              {paragraphs.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </article>
  )
}
