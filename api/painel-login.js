// Login do Painel de Controle da Liga Neo SJ.
const P = require('./_painel');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return P.json(res, 405, { ok: false, erro: 'metodo' });
  if (!process.env.PAINEL_USUARIO || !process.env.PAINEL_SENHA) return P.json(res, 503, { ok: false, erro: 'nao_configurado' });
  const b = await P.lerCorpo(req) || {};
  const okU = P.iguais(String(b.usuario || '').trim().toUpperCase(), String(process.env.PAINEL_USUARIO).trim().toUpperCase());
  const okS = P.iguais(String(b.senha || ''), String(process.env.PAINEL_SENHA));
  if (!okU || !okS) { await new Promise(r => setTimeout(r, 900)); return P.json(res, 401, { ok: false, erro: 'credenciais' }); }
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 30;
  return P.json(res, 200, { ok: true, token: P.assinar({ u: 'admin', exp }), exp, banco: !!(await P.blob()) });
};
