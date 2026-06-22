import Link from 'next/link';

const sections = [
  ['Dados tratados', 'Usamos o identificador, nome, apelido e avatar do Discord; personagem, classe, camada, progresso e presenca; movimentacoes de DKP; participacao em leiloes, interesses e pedidos; comprovantes enviados; e registros de auditoria necessarios para operar a guilda.'],
  ['Finalidade', 'Os dados existem para autenticar membros, aplicar regras de loot e DKP, registrar presenca, organizar entregas, permitir revisao da Staff, prevenir fraude e manter historico operacional. Nao vendemos dados nem os usamos para publicidade.'],
  ['Compartilhamento', 'A autenticacao e a comunicacao usam o Discord. Comprovantes podem ser armazenados no provedor configurado pela guilda. Informacoes operacionais sao acessiveis apenas conforme o papel do usuario; bids, locks, rankings e participantes permanecem sigilosos para players durante o leilao.'],
  ['Retencao e seguranca', 'Mantemos registros enquanto forem necessarios para a governanca e o historico da guilda. Aplicamos controle por papeis, auditoria, backups e protecoes tecnicas. Nenhum sistema conectado a internet oferece risco zero.'],
  ['Seus direitos', 'Voce pode pedir a Staff para consultar, corrigir ou excluir dados pessoais quando isso nao conflitar com obrigacoes de auditoria, integridade do DKP ou defesa contra fraude. Tambem pode encerrar o uso deixando a guilda e solicitando a desativacao do perfil.'],
  ['Menores', 'A plataforma nao e destinada a menores de 18 anos. Se a Staff identificar cadastro de menor, deve desativar o acesso e avaliar a exclusao dos dados.'],
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl p-5 py-12 sm:p-8 sm:py-16">
      <div className="rounded-2xl border border-primary/20 bg-card/85 p-6 shadow-rune backdrop-blur-xl sm:p-10">
        <p className="page-kicker">Raven Command</p>
        <h1 className="mt-2 font-[var(--font-cinzel)] text-3xl font-bold sm:text-5xl">Politica de privacidade</h1>
        <p className="mt-4 text-sm text-muted-foreground">Ultima atualizacao: 21 de junho de 2026</p>
        <p className="mt-8 leading-relaxed text-muted-foreground">Esta politica descreve como a plataforma da guilda G3X trata dados dos membros. Ela substitui o texto generico anteriormente publicado e reflete o funcionamento real do sistema.</p>
        <div className="mt-8 space-y-6">
          {sections.map(([title, body]) => (
            <section key={title} className="rounded-lg border border-white/10 bg-background/40 p-5">
              <h2 className="font-[var(--font-cinzel)] text-xl font-bold text-primary">{title}</h2>
              <p className="mt-2 leading-relaxed text-muted-foreground">{body}</p>
            </section>
          ))}
        </div>
        <section className="mt-8 border-t border-white/10 pt-6">
          <h2 className="font-[var(--font-cinzel)] text-xl font-bold">Contato e solicitacoes</h2>
          <p className="mt-2 text-muted-foreground">Solicitacoes devem ser feitas diretamente a Staff nos canais oficiais da guilda. Nunca envie senha, token ou codigo de autenticacao.</p>
        </section>
        <Link href="/login" className="mt-8 inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-semibold text-primary-foreground">Voltar para o acesso</Link>
      </div>
    </main>
  );
}
