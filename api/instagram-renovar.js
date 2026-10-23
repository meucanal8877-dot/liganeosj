// Renova a validade do token do Instagram (chamado toda segunda pelo agendamento da Vercel).
// Protegido: só executa com o CRON_SECRET configurado na Vercel.
module.exports = async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers['authorization'] !== 'Bearer ' + secret) return res.status(401).send('não autorizado');
  const token = process.env.INSTAGRAM_TOKEN;
  if (!token) return res.status(200).send('sem token');
  try {
    const r = await fetch('https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=' + encodeURIComponent(token));
    const j = await r.json();
    return res.status(200).send(j && j.expires_in ? 'token renovado por ' + Math.round(j.expires_in / 86400) + ' dias' : 'não renovado');
  } catch (e) {
    return res.status(200).send('falha ao renovar');
  }
};
