// Publica no site oficial o jogo (e a notícia do resultado) enviado pelo Painel.
// Grava o dados.json do repositório do site pelo GitHub; a Vercel republica o site sozinha.
// A chave fica SOMENTE na variável de ambiente GITHUB_TOKEN da Vercel (token "fine-grained" com
// acesso só a este repositório e permissão "Contents: Read and write").
const P = require('./_painel');
const REPO = process.env.SITE_REPO || 'meucanal8877-dot/liganeosj';
const BRANCH = process.env.SITE_BRANCH || 'main';
const ARQ = 'dados.json';

const ID = /^[a-z0-9][a-z0-9-]{0,79}$/;
const str = (v, max = 300) => (typeof v === 'string' ? v : v == null ? '' : String(v)).slice(0, max);
const idOk = v => typeof v === 'string' && ID.test(v);
const https = u => /^https:\/\/[^\s"'<>]+$/i.test(String(u || ''));

function limparEvento(e) {
  const tipo = ['gol', 'assistencia'].includes(e && e.tipo) ? e.tipo : null; if (!tipo) return null;
  const o = { id: idOk(e.id) ? e.id : '', tipo, timeId: str(e.timeId, 80), jogadorId: idOk(e.jogadorId) ? e.jogadorId : '', assistenciaId: idOk(e.assistenciaId) ? e.assistenciaId : '', minuto: Number.isInteger(e.minuto) && e.minuto >= 0 && e.minuto < 300 ? e.minuto : '' };
  if (tipo === 'gol' && e.contra) o.contra = true;
  if (e.diarista) { o.diarista = true; o.nomeDiarista = str(e.nomeDiarista, 60); }
  return o;
}
function limparPartida(p) {
  if (!p || typeof p !== 'object') return null;
  const n = v => (v === '' || v == null) ? null : (Number.isInteger(v) && v >= 0 && v < 200 ? v : NaN);
  const o = {
    id: idOk(p.id) ? p.id : '', titulo: str(p.titulo, 40), rodada: Number.isInteger(p.rodada) ? p.rodada : 0,
    mes: /^\d{4}-\d{2}$/.test(p.mes) ? p.mes : '', data: /^\d{4}-\d{2}-\d{2}$/.test(p.data) ? p.data : '', hora: /^\d{2}:\d{2}$/.test(p.hora) ? p.hora : '',
    local: str(p.local, 80), mandanteId: str(p.mandanteId, 80), visitanteId: str(p.visitanteId, 80),
    golsMandante: n(p.golsMandante), golsVisitante: n(p.golsVisitante), vencedorId: '',
    situacao: p.situacao === 'encerrado' ? 'encerrado' : 'agendado',
    resumo: str(p.resumo, 1500), destaque: str(p.destaque, 300),
    eventos: (Array.isArray(p.eventos) ? p.eventos : []).slice(0, 200).map(limparEvento).filter(Boolean),
    incluidoNoTotalOficial: false,
    midia: (Array.isArray(p.midia) ? p.midia : []).slice(0, 20).filter(m => m && https(m.url)).map(m => ({ tipo: ['fotos', 'instagram', 'video', 'link'].includes(m.tipo) ? m.tipo : 'link', titulo: str(m.titulo, 120), url: str(m.url, 500) })),
    fonte: str(p.fonte, 200), destaqueJogadorId: idOk(p.destaqueJogadorId) ? p.destaqueJogadorId : ''
  };
  if (!o.id || !o.mes || !o.rodada || Number.isNaN(o.golsMandante) || Number.isNaN(o.golsVisitante)) return null;
  return o;
}
function limparNoticia(n) {
  if (!n || typeof n !== 'object' || !idOk(n.id)) return null;
  return { id: n.id, data: /^\d{4}-\d{2}-\d{2}$/.test(n.data) ? n.data : '', categoria: 'Resultado', ordem: 0, titulo: str(n.titulo, 160), imagem: '', texto: str(n.texto, 4000) };
}
const gh = (caminho, tk, opt = {}) => fetch('https://api.github.com/repos/' + REPO + caminho, {
  ...opt, headers: { Authorization: 'Bearer ' + tk, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'liganeosj-painel', ...(opt.headers || {}) }
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') return P.json(res, 405, { ok: false, erro: 'metodo' });
  if (!P.autorizado(req)) return P.json(res, 401, { ok: false, erro: 'sessao' });
  const tk = process.env.GITHUB_TOKEN;
  if (!tk) return P.json(res, 503, { ok: false, erro: 'sem_token' });
  const corpo = await P.lerCorpo(req) || {};
  const pt = limparPartida(corpo.partida);
  if (!pt) return P.json(res, 400, { ok: false, erro: 'partida' });
  const nt = limparNoticia(corpo.noticia);
  const novos = (Array.isArray(corpo.jogadores) ? corpo.jogadores : []).slice(0, 60).filter(j => j && idOk(j.id)).map(j => ({ id: j.id, nome: str(j.nome, 80), apelido: str(j.apelido, 40), numero: str(j.numero, 4), posicao: str(j.posicao, 30) || 'A confirmar', timeId: '', foto: '', retrato: '' }));

  try {
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const r = await gh('/contents/' + ARQ + '?ref=' + encodeURIComponent(BRANCH), tk, { cache: 'no-store' });
      if (!r.ok) return P.json(res, 502, { ok: false, erro: 'github_leitura', status: r.status });
      const f = await r.json();
      const bruto = Buffer.from(f.content || '', 'base64').toString('utf8');
      const d = JSON.parse(bruto);
      const times = new Set((d.times || []).map(t => t.id));
      if (!times.has(pt.mandanteId) || !times.has(pt.visitanteId)) return P.json(res, 400, { ok: false, erro: 'times' });

      // jogadores que ainda não existem no site
      d.jogadores = d.jogadores || [];
      const ids = new Set(d.jogadores.map(j => j.id));
      const citados = new Set(pt.eventos.flatMap(e => [e.jogadorId, e.assistenciaId]).concat(pt.destaqueJogadorId).filter(Boolean));
      novos.forEach(j => { if (citados.has(j.id) && !ids.has(j.id)) { d.jogadores.push(j); ids.add(j.id); } });
      pt.eventos.forEach(e => { if (e.jogadorId && !ids.has(e.jogadorId)) e.jogadorId = ''; if (e.assistenciaId && !ids.has(e.assistenciaId)) e.assistenciaId = ''; if (!times.has(e.timeId)) e.timeId = pt.mandanteId; });
      if (pt.destaqueJogadorId && !ids.has(pt.destaqueJogadorId)) pt.destaqueJogadorId = '';

      // partida: mesma id, ou mesmo mês e número do jogo
      d.partidas = d.partidas || [];
      const i = d.partidas.findIndex(x => x.id === pt.id || (x.mes === pt.mes && Number(x.rodada) === pt.rodada));
      if (i >= 0) {
        const antiga = d.partidas[i];
        const midia = [...(antiga.midia || [])];
        pt.midia.forEach(m => { if (!midia.some(x => x.url === m.url)) midia.push(m); });
        d.partidas[i] = { ...antiga, ...pt, id: antiga.id, midia };
      } else d.partidas.push(pt);
      const salva = i >= 0 ? d.partidas[i] : pt;

      // notícia do resultado (substitui a do mesmo jogo, se já existir)
      if (nt && salva.situacao === 'encerrado') {
        d.noticias = d.noticias || [];
        const venc = salva.golsMandante > salva.golsVisitante ? salva.mandanteId : salva.golsVisitante > salva.golsMandante ? salva.visitanteId : '';
        const t = (d.times || []).find(x => x.id === venc);
        nt.imagem = t && t.escudo ? t.escudo : ((d.config && d.config.logo) || '');
        const k = d.noticias.findIndex(x => x.id === nt.id);
        if (k >= 0) d.noticias[k] = { ...d.noticias[k], ...nt, imagem: nt.imagem || d.noticias[k].imagem }; else d.noticias.unshift(nt);
      }

      d.versao = (Number(d.versao) || 0) + 1;
      d.atualizadoEm = new Date().toISOString();
      const novo = JSON.stringify(d, null, 1) + (bruto.endsWith('\n') ? '\n' : '');
      const msg = `Painel: ${salva.titulo || 'jogo'} de ${salva.mes}` + (salva.situacao === 'encerrado' ? ` (${salva.golsMandante} x ${salva.golsVisitante})` : '');
      const w = await gh('/contents/' + ARQ, tk, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg, content: Buffer.from(novo, 'utf8').toString('base64'), sha: f.sha, branch: BRANCH }) });
      if (w.ok) { const wj = await w.json(); return P.json(res, 200, { ok: true, versao: d.versao, partidaId: salva.id, commit: ((wj.commit || {}).sha || '').slice(0, 7) }); }
      if (w.status === 409 || w.status === 422) continue; // outra gravação ao mesmo tempo: lê de novo e tenta outra vez
      return P.json(res, 502, { ok: false, erro: 'github_escrita', status: w.status });
    }
    return P.json(res, 409, { ok: false, erro: 'conflito' });
  } catch (e) {
    return P.json(res, 500, { ok: false, erro: 'servidor', detalhe: String(e && e.message || e).slice(0, 200) });
  }
};
