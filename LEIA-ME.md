# Liga Neo SJ: publicar na Vercel

Esta pasta é o site completo e pronto para a Vercel: páginas, fotos, vídeos, dados oficiais (`dados.json`) e a integração com o Instagram (pasta `api`).

## 1. Publicar (uma vez, cerca de 5 minutos)

O jeito recomendado é usar o GitHub. Com ele, as próximas atualizações do site viram automáticas.

1. Crie uma conta grátis em github.com, se ainda não tiver.
2. Clique em **New repository**, use o nome `liganeosj`, deixe como **Public** ou **Private** e clique em **Create repository**.
3. Na página do repositório, clique em **uploading an existing file**.
4. Descompacte o ZIP e **arraste todo o conteúdo da pasta** (`index.html`, `dados.json`, `vercel.json` e as pastas `api`, `img` e `video`) para a área de upload. Depois clique em **Commit changes**.
5. Entre em vercel.com com a conta do GitHub e clique em **Add New → Project**.
6. Escolha o repositório `liganeosj` e clique em **Deploy**. Não é preciso mudar nenhuma configuração.
7. Pronto. O endereço fica parecido com `https://liganeosj.vercel.app`. Se quiser um domínio próprio (ex.: liganeosj.com.br), configure em **Settings → Domains**.

**Alternativa sem GitHub (usando o terminal):** com o Node.js instalado, abra o terminal dentro desta pasta e rode `npx vercel --prod`. Siga o login que aparecer.

## 2. Instagram atualizado automaticamente

O site mostra as últimas publicações do @liganeosj sozinho, direto da API oficial do Instagram. Isso só é feito por meio de uma chave de acesso (token), nunca copiando a página.

1. A conta @liganeosj precisa ser **Profissional** (Criador de conteúdo ou Empresa). Para isso, vá em Configurações → Tipo de conta, no app do Instagram.
2. Em developers.facebook.com, crie um app do tipo **Empresa**, adicione o produto **Instagram** e escolha **API do Instagram com login do Instagram**.
3. Em **Gerar tokens de acesso**, adicione a conta @liganeosj e gere o token.
4. Na Vercel, abra **Settings → Environment Variables** do projeto e crie:
   - `INSTAGRAM_TOKEN` = o token gerado
   - `CRON_SECRET` = qualquer senha longa inventada por você (protege a renovação automática)
5. Clique em **Redeploy**. As publicações passam a aparecer em "Últimas publicações", na página Instagram e no início do site.

Toda segunda-feira a Vercel renova a validade do token sozinha. Se um dia as publicações pararem de aparecer, gere um token novo e troque o valor de `INSTAGRAM_TOKEN`.

O token **nunca** vai no código. Ele fica só nas configurações da Vercel.

Enquanto o token não estiver configurado, o site continua normal e mostra as publicações em destaque escolhidas pela organização.

## 3. Como atualizar resultados, ranking e Draft

O painel administrativo (gols, placares, Draft, notícias, apoiadores) continua no site dentro do Claude. Depois de editar lá:

- **Com o GitHub conectado ao Claude** (claude.ai → Configurações → Conectores → GitHub), é só pedir "atualize o site da Vercel". O Claude envia o novo `dados.json` e a Vercel publica sozinha.
- **Sem GitHub**, o Claude gera um `dados.json` novo e você substitui o arquivo no repositório.

Resultados e estatísticas nunca são tirados automaticamente das legendas do Instagram. Eles só mudam com confirmação da organização, para não aparecer dado errado no site.
