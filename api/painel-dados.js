// Banco de dados do Painel: cada salvamento vira uma versão no Vercel Blob (as últimas 40 ficam guardadas como backup).
const P = require('./_painel');
module.exports = async (req, res) => {
  if (!P.autorizado(req)) return P.json(res, 401, { ok: false, erro: 'sessao' });
  const b = await P.blob();
  if (!b) return P.json(res, 503, { ok: false, erro: 'sem_banco' });
  try {
    if (req.method === 'GET') {
      const lista = await P.versoes(b);
      const q = req.query || {};
      if (q.versoes) return P.json(res, 200, { ok: true, versoes: lista.map(v => ({ versao: v.pathname, salvoEm: P.tsDe(v.pathname), tamanho: v.size })) });
      const alvo = q.versao ? lista.find(v => v.pathname === q.versao) : lista[0];
      if (!alvo) return P.json(res, 200, { ok: true, vazio: true });
      return P.json(res, 200, { ok: true, versao: alvo.pathname, salvoEm: P.tsDe(alvo.pathname), estado: await P.ler(b, alvo) });
    }
    if (req.method === 'PUT' || req.method === 'POST') {
      const corpo = await P.lerCorpo(req);
      if (!corpo || !corpo.estado || typeof corpo.estado !== 'object') return P.json(res, 400, { ok: false, erro: 'corpo' });
      const lista = await P.versoes(b);
      const atual = lista[0];
      if (atual && !corpo.forcar && P.tsDe(atual.pathname) > P.tsDe(corpo.base)) {
        let est = null; try { est = await P.ler(b, atual); } catch (e) {}
        return P.json(res, 409, { ok: false, erro: 'conflito', versao: atual.pathname, salvoEm: P.tsDe(atual.pathname), estado: est });
      }
      const ts = Math.max(Date.now(), atual ? P.tsDe(atual.pathname) + 1 : 0);
      const novo = await P.gravar(b, P.PREFIXO + ts + '.json', JSON.stringify(corpo.estado), 'application/json');
      const velhos = lista.slice(P.MANTER_VERSOES - 1);
      if (velhos.length > 5) { try { await b.del(velhos.map(v => v.url)); } catch (e) {} }
      return P.json(res, 200, { ok: true, versao: novo.pathname, salvoEm: ts });
    }
    return P.json(res, 405, { ok: false, erro: 'metodo' });
  } catch (e) {
    return P.json(res, 500, { ok: false, erro: 'servidor', detalhe: String(e && e.message || e).slice(0, 200) });
  }
};
