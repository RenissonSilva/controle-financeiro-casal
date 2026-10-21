# Deploy: Vercel (Hobby) + TiDB Cloud (Starter)

Os dois são gratuitos e não pedem cartão. O PHP roda na Vercel pelo runtime da comunidade
`vercel-php` (ver `vercel.json` e `api/index.php`). Validado localmente com TiDB v8.5: as
migrations e a suíte de testes passam, o dump do MySQL importa sem ajuste e o sync do
Pluggy leva poucos segundos.

## 1. Banco no TiDB Cloud

1. Em [tidbcloud.com](https://tidbcloud.com), crie um cluster **Starter** na região
   **AWS N. Virginia (us-east-1)**, colada na função da Vercel (`iad1`, Washington).
2. Em **Connect**, gere a senha e anote host, porta (`4000`) e usuário (`xxxx.root`).
3. Leve o banco atual (rode do seu PC; o dump tem dados financeiros, apague depois):

   ```bash
   MYSQL_PWD='<senha do MySQL local>' mysqldump -u <usuário local> --single-transaction \
     --no-tablespaces --skip-triggers controle_financeiro > dump.sql

   mysql -h <host do TiDB> -P 4000 -u '<usuário do TiDB>' -p \
     --ssl-mode=VERIFY_IDENTITY --ssl-ca=/etc/ssl/certs/ca-certificates.crt \
     -e 'CREATE DATABASE controle_financeiro'
   mysql -h <host do TiDB> -P 4000 -u '<usuário do TiDB>' -p \
     --ssl-mode=VERIFY_IDENTITY --ssl-ca=/etc/ssl/certs/ca-certificates.crt \
     controle_financeiro < dump.sql

   rm dump.sql
   ```

   Pelo MySQL Workbench: crie antes o schema `controle_financeiro` e escolha-o em
   **Default Target Schema** no Data Import. Sem isso o import cai no schema `sys` e falha com
   `DROP command denied`.

   Começando do zero em vez de importar: rode `migrate` e `user:create-owner` contra o TiDB
   (ver seção 4).

## 2. Projeto na Vercel

1. Suba o código para o GitHub e importe o repositório na Vercel (Framework Preset: **Other**).
   Build, saída, função PHP, rotas e cron já vêm do `vercel.json`. A versão do Node (22.x,
   exigida pelo `vercel-php`) vem do `engines` do `package.json`. A saída estática é `dist`,
   uma cópia do `public/` sem `index.php` e `.htaccess`: com o `public/` direto, a Vercel
   servia o `index.php` como texto em `/` em vez de cair no rewrite para a função.
2. Monte um `.env.production` local (já está no `.gitignore` e no `.vercelignore`) neste formato:

   ```dotenv
   # ===== App =====
   APP_NAME=                      # igual ao .env local
   APP_ENV=production
   APP_DEBUG=false
   APP_KEY=                       # novo: php artisan key:generate --show
   APP_URL=https://<projeto>.vercel.app
   APP_LOCALE=pt_BR
   APP_FALLBACK_LOCALE=en
   APP_FAKER_LOCALE=en_US

   # ===== Banco (TiDB Cloud) =====
   DB_CONNECTION=mysql
   DB_HOST=                       # do "Connect" do TiDB
   DB_PORT=4000
   DB_DATABASE=controle_financeiro
   DB_USERNAME=                   # formato xxxx.root
   DB_PASSWORD=
   MYSQL_ATTR_SSL_CA=/etc/pki/tls/certs/ca-bundle.crt

   # ===== Sessão, cache e fila =====
   SESSION_DRIVER=database
   SESSION_SECURE_COOKIE=true
   CACHE_STORE=database
   QUEUE_CONNECTION=sync

   # ===== Integrações (iguais ao .env local) =====
   GROQ_API_KEY=
   GROQ_MODEL=openai/gpt-oss-120b
   PLUGGY_CLIENT_ID=
   PLUGGY_CLIENT_SECRET=
   PLUGGY_BASE_URL=https://api.pluggy.ai
   PLUGGY_USE_SANDBOX=false

   # ===== Cron =====
   CRON_SECRET=                   # aleatório: openssl rand -hex 32

   # ===== Bot do WhatsApp (opcional, ver seção 5) =====
   WHATSAPP_TOKEN=
   WHATSAPP_PHONE_NUMBER_ID=
   WHATSAPP_APP_SECRET=
   WHATSAPP_VERIFY_TOKEN=         # aleatório: openssl rand -hex 16
   ```

   Na Vercel, em **Settings → Environment Variables**, cole o conteúdo do arquivo inteiro no
   campo **Key** (ela separa as variáveis sozinha), marque **Production** e salve. Storage,
   caches e logs não entram: o `api/index.php` já cuida disso.
3. Faça o deploy e abra `/login`.

## 3. Sincronização diária

O cron do `vercel.json` chama `/cron/openfinance-sync` às 09:30 UTC (06:30 de Brasília).
No Hobby a precisão é de uma hora, então roda entre 06:30 e 07:29. Sem `CRON_SECRET`, ou com
um segredo errado, a rota responde 404. Para disparar na mão:

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" https://<projeto>.vercel.app/cron/openfinance-sync
```

## 4. Comandos artisan

Não existe terminal na Vercel. `migrate`, `user:create-owner` e `openfinance:sync --rebuild`
rodam do seu PC, apontando para o TiDB:

```bash
php artisan config:clear   # com config em cache as variáveis abaixo são ignoradas!
DB_HOST=<host> DB_PORT=4000 DB_USERNAME='<usuário>' DB_PASSWORD='<senha>' \
DB_DATABASE=controle_financeiro MYSQL_ATTR_SSL_CA=/etc/ssl/certs/ca-certificates.crt \
php artisan migrate --force
```

Depois de cada deploy com migration nova, rode o `migrate` assim.

## 5. Bot do WhatsApp

Mensagens como "uber de ontem meu", "drogasil de hoje dela" ou "quanto a Lua deve?" mudam de
quem é a cobrança ou respondem o acerto. Usa a WhatsApp Cloud API oficial da Meta: as
mensagens que vocês mandam são grátis, e as respostas do bot têm 1.000 grátis por mês. O
número de teste da Meta (+1 555…) não pede cartão nem chip e aceita até 5 destinatários.

1. Em [developers.facebook.com](https://developers.facebook.com/apps), crie um app do tipo
   **Business** e adicione o produto **WhatsApp**. Em **WhatsApp → API Setup** aparecem o número
   de teste e o **Phone number ID** (`WHATSAPP_PHONE_NUMBER_ID`).
2. Ainda em **API Setup**, no campo **To**, adicione o seu número e o da Lua. Cada um confirma
   com o código que chega no WhatsApp.
3. Token permanente: em [business.facebook.com](https://business.facebook.com/settings) →
   **Usuários → Usuários do sistema**, crie um usuário **Admin**, atribua a ele o app e a conta
   do WhatsApp (controle total) e gere um token sem validade com as permissões
   `whatsapp_business_messaging` e `whatsapp_business_management` (`WHATSAPP_TOKEN`). O token
   que aparece no API Setup expira em 24 h, então não use esse.
4. Em **App settings → Basic**, copie o **App secret** (`WHATSAPP_APP_SECRET`).
5. Coloque as quatro variáveis na Vercel (o `WHATSAPP_VERIFY_TOKEN` é qualquer texto
   aleatório) e faça um redeploy.
6. Em **WhatsApp → Configuration → Webhook**, use a Callback URL
   `https://<projeto>.vercel.app/webhooks/whatsapp`, o mesmo verify token, clique em **Verify
   and save** e, em **Webhook fields**, assine `messages`.
7. Rode o `migrate` no TiDB (seção 4). Cada um salva o próprio número em **Perfil → WhatsApp**
   e manda "oi" para o número de teste.

Só números salvos no Perfil de uma conta vinculada são atendidos. "Meu" é de quem mandou: a
conta principal é o pagador 1 e a vinculada, o pagador 2. A Lua precisa da permissão
**Lançamentos → Criar e editar** para mudar cobranças, mas pode consultar o acerto sem ela.
Compra que ainda não chegou do banco fica guardada por 5 dias e é aplicada na sincronização
em que aparecer. Para testar sem WhatsApp, numa cópia do banco:

```bash
DB_DATABASE=controle_financeiro_e2e php artisan chat:simulate <email> "uber de ontem meu"
```

## Limites

- **5 min por requisição** (Hobby). O sync do dia a dia leva segundos.
- **Uso pessoal** apenas (termos do Hobby).
- **Sem extensão `gd`** no runtime: o PDF funciona, mas não pode ter imagem.
- **"Esqueci a senha" não manda e-mail** enquanto não houver um `MAIL_MAILER` de verdade configurado.
