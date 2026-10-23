// Últimas publicações do perfil oficial (Instagram API).
// O token fica SOMENTE na variável de ambiente INSTAGRAM_TOKEN da Vercel, nunca no código público.
module.exports = async (req, res) => {
  const token = process.env.INSTAGRAM_TOKEN;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (!token) {
    res.setHeader('Cache-Control', 's-maxage=300');
    return res.status(200).send(JSON.stringify({ ok: false, motivo: 'sem_token', posts: [] }));
  }
  const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
  try {
    const r = await fetch('https://graph.instagram.com/me/media?fields=' + fields + '&limit=12&access_token=' + encodeURIComponent(token));
    const j = await r.json();
    if (!r.ok || j.error) {
      res.setHeader('Cache-Control', 's-maxage=300');
      return res.status(200).send(JSON.stringify({ ok: false, motivo: 'erro_instagram', posts: [] }));
    }
    const posts = (j.data || []).map(p => ({
      id: p.id,
      legenda: String(p.caption || '').slice(0, 600),
      tipo: p.media_type,
      imagem: p.media_type === 'VIDEO' ? (p.thumbnail_url || '') : (p.media_url || ''),
      link: p.permalink,
      data: p.timestamp
    }));
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
    return res.status(200).send(JSON.stringify({ ok: true, atualizadoEm: new Date().toISOString(), posts }));
  } catch (e) {
    res.setHeader('Cache-Control', 's-maxage=120');
    return res.status(200).send(JSON.stringify({ ok: false, motivo: 'falha_rede', posts: [] }));
  }
};
