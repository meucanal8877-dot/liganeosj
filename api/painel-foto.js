// Envio de foto de jogador pelo Painel (imagem já reduzida no aparelho).
const P = require('./_painel');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return P.json(res, 405, { ok: false, erro: 'metodo' });
  if (!P.autorizado(req)) return P.json(res, 401, { ok: false, erro: 'sessao' });
  const b = await P.blob();
  if (!b) return P.json(res, 503, { ok: false, erro: 'sem_banco' });
  const corpo = await P.lerCorpo(req) || {};
  const m = /^data:(image\/(webp|jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(String(corpo.dataUrl || ''));
  if (!m) return P.json(res, 400, { ok: false, erro: 'imagem' });
  const buf = Buffer.from(m[3], 'base64');
  if (buf.length > 1.5 * 1024 * 1024) return P.json(res, 413, { ok: false, erro: 'grande' });
  const nome = String(corpo.nome || 'jogador').toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 40) || 'jogador';
  try {
    const r = await P.gravar(b, 'painel/fotos/' + nome + '.' + (m[2] === 'jpeg' ? 'jpg' : m[2]), buf, m[1]);
    if (P.acesso() === 'private') return P.json(res, 200, { ok: true, url: '' });
    return P.json(res, 200, { ok: true, url: r.url });
  } catch (e) { return P.json(res, 500, { ok: false, erro: 'servidor' }); }
};
