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

   Começando do zero em vez de importar: rode `migrate` e `user:create-owner` contra o TiDB
   (ver seção 4).

## 2. Projeto na Vercel

1. Suba o código para o GitHub e importe o repositório na Vercel (Framework Preset: **Other**).
   Build, saída, função PHP, rotas e cron já vêm do `vercel.json`. A versão do Node (22.x,
   exigida pelo `vercel-php`) vem do `engines` do `package.json`.
2. Em **Settings → Environment Variables** (Production):

   | Variável | Valor |
   |---|---|
   | `APP_NAME` | igual ao `.env` local |
   | `APP_ENV` | `production` |
   | `APP_DEBUG` | `false` |
   | `APP_KEY` | novo, de `php artisan key:generate --show` (só desloga quem estiver logado) |
   | `APP_URL` | `https://<projeto>.vercel.app` |
   | `APP_LOCALE` / `APP_FALLBACK_LOCALE` / `APP_FAKER_LOCALE` | iguais ao `.env` local |
   | `DB_CONNECTION` | `mysql` |
   | `DB_HOST` / `DB_PORT` / `DB_USERNAME` / `DB_PASSWORD` | do TiDB (porta `4000`) |
   | `DB_DATABASE` | `controle_financeiro` |
   | `MYSQL_ATTR_SSL_CA` | `/etc/pki/tls/certs/ca-bundle.crt` (CA do sistema na Vercel; o TiDB exige TLS) |
   | `SESSION_DRIVER` / `CACHE_STORE` | `database` |
   | `SESSION_SECURE_COOKIE` | `true` |
   | `QUEUE_CONNECTION` | `sync` (não tem worker de fila) |
   | `GROQ_API_KEY` / `GROQ_MODEL` | iguais ao `.env` local |
   | `PLUGGY_CLIENT_ID` / `PLUGGY_CLIENT_SECRET` / `PLUGGY_BASE_URL` / `PLUGGY_USE_SANDBOX` | iguais ao `.env` local |
   | `CRON_SECRET` | aleatório, de `openssl rand -hex 32` |

   Storage, caches e logs **não** entram aqui: o `api/index.php` já manda tudo para o `/tmp`
   e os logs para **Vercel → Logs**.
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

## Limites

- **5 min por requisição** (Hobby). O sync do dia a dia leva segundos.
- **Uso pessoal** apenas (termos do Hobby).
- **Sem extensão `gd`** no runtime: o PDF funciona, mas não pode ter imagem.
- **"Esqueci a senha" não manda e-mail** enquanto não houver um `MAIL_MAILER` de verdade configurado.
