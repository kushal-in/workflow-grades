# workflow-grades

Workflow (IITM's student portal) only works on Firefox and only on campus WiFi (or proxy). On mobile it's basically unusable (unless you are a sociopath and have firefox). This fixes that.

Website: https://workflow-grades.vercel.app/

## what it does

Logs into Workflow on your behalf and shows your grades, grouped by semester with CG calculated, on any browser, from anywhere.

## how

IITM has a proxy at `remote.iitm.ac.in:8372` that lets you reach campus services from outside. Your LDAP credentials authenticate with it, same ones you use to login.

The login form has a "captcha" that's just plain text sitting in an HTML tag, so the code reads it and submits it automatically. I guess the IT team didnt feel like it

After login, the grades page HTML gets fetched and parsed to pull out the table.

## the important bit

Your credentials are never stored. Not in a database (there isn't one), not in logs, not anywhere. They're used for one request and that's it. The backend is ~80 lines with zero write operations — you can read it yourself in `pages/api/grades.js`.

## run it locally

```bash
npm install
npm run dev
```
