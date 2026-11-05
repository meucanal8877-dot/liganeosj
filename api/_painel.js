// Funções compartilhadas do Painel de Controle (não é uma rota: arquivos com "_" não viram endpoints).
// Usuário e senha ficam SOMENTE nas variáveis de ambiente PAINEL_USUARIO e PAINEL_SENHA da Vercel.
const crypto = require('crypto');

const PREFIXO = 'painel/estado-';
const MANTER_VERSOES = 40;

function chave() {
  const u = process.env.PAINEL_USUARIO || '', s = process.env.PAINEL_SENHA || '';
  if (!u || !s) return null;
  return crypto.createHash('sha256').update('liganeosj-painel|' + u + '|' + s + '|' + (process.env.PAINEL_SEGREDO || '')).digest();
}
const b64u = buf => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function assinar(dados) {
  const k = chave(); if (!k) return null;
  const corpo = b64u(JSON.stringify(dados));
  return corpo + '.' + b64u(crypto.createHmac('sha256', k).update(corpo).digest());
}
function verificar(token) {
  const k = chave(); if (!k || !token) return null;
  const [corpo, sig] = String(token).split('.');
  if (!corpo || !sig) return null;
  const esperado = b64u(crypto.createHmac('sha256', k).update(corpo).digest());
  const a = Buffer.from(sig), b = Buffer.from(esperado);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const d = JSON.parse(Buffer.from(corpo.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    if (!d.exp || Date.now() > d.exp) return null;
    return d;
  } catch (e) { return null; }
}
function iguais(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest(), y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}
function json(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}
function autorizado(req) {
  const h = req.headers['authorization'] || '';
  return verificar(h.replace(/^Bearer\s+/i, ''));
}
async function lerCorpo(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return null; } }
  const partes = []; for await (const p of req) partes.push(p);
  try { return JSON.parse(Buffer.concat(partes).toString('utf8') || '{}'); } catch (e) { return null; }
}
async function blob() {
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) return null;
  try { return require('@vercel/blob'); } catch (e) {}
  try { return await import('@vercel/blob'); } catch (e) { return null; }
}
// O tipo do armazenamento (público ou privado) é definido ao criar o Blob na Vercel; o código funciona com os dois.
let ACESSO = process.env.PAINEL_BLOB_ACESSO === 'private' ? 'private' : 'public';
async function gravar(b, nome, corpo, tipo) {
  try { return await b.put(nome, corpo, { access: ACESSO, contentType: tipo, addRandomSuffix: true }); }
  catch (e) {
    if (!/private|public|access/i.test(String(e && e.message))) throw e;
    ACESSO = ACESSO === 'public' ? 'private' : 'public';
    return await b.put(nome, corpo, { access: ACESSO, contentType: tipo, addRandomSuffix: true });
  }
}
async function ler(b, item) {
  try { const r = await fetch(item.url, { cache: 'no-store' }); if (r.ok) return await r.json(); } catch (e) {}
  if (typeof b.get === 'function') {
    const g = await b.get(item.url, { access: 'private', useCache: false });
    if (g && g.stream) return JSON.parse(await new Response(g.stream).text());
  }
  throw new Error('leitura');
}
const acesso = () => ACESSO;
const tsDe = pathname => { const m = /estado-(\d+)/.exec(pathname || ''); return m ? Number(m[1]) : 0; };
async function versoes(b) {
  let todos = [], cursor;
  do {
    const r = await b.list({ prefix: PREFIXO, limit: 1000, cursor });
    todos = todos.concat(r.blobs || []); cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return todos.sort((x, y) => tsDe(y.pathname) - tsDe(x.pathname));
}
module.exports = { gravar, ler, acesso, PREFIXO, MANTER_VERSOES, assinar, verificar, iguais, json, autorizado, lerCorpo, blob, versoes, tsDe };
