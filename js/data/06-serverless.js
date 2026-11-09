M({
  id: 'lambda', name: 'AWS Lambda', stage: 'serverless', mono: 'λ', h: 10, sim: 'serverless', simCfg: { platform: 'AWS Lambda' }, pre: ['aws'],
  pitch: 'Exécuter du code en réaction à un événement, sans gérer aucun serveur.',
  l: [[
    ['Handler et événements', `Une fonction Lambda reçoit un **événement** et renvoie une réponse. S3, API Gateway, SQS ou un planificateur peuvent la déclencher. Tu paies au nombre d'appels et à la durée.`, `import json

def handler(event, context):
    nom = (event.get("queryStringParameters") or {}).get("nom", "monde")
    return {
        "statusCode": 200,
        "headers": {"content-type": "application/json"},
        "body": json.dumps({"message": f"Bonjour {nom}"}),
    }`, 'python'],
  ], [
    ['Déployer avec SAM', `**AWS SAM** décrit fonctions et déclencheurs en YAML. La fonction a un rôle IAM dédié, et les variables de configuration arrivent par l'environnement. Une Function URL ou API Gateway l'expose en HTTP.`, `AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Resources:
  Api:
    Type: AWS::Serverless::Function
    Properties:
      Handler: app.handler
      Runtime: python3.13
      MemorySize: 512
      Timeout: 10
      Architectures: [arm64]
      Policies:
        - DynamoDBCrudPolicy: { TableName: !Ref Table }
      Events:
        Http: { Type: HttpApi }
  Table:
    Type: AWS::Serverless::SimpleTable
# sam build && sam deploy --guided`, 'yaml'],
  ], [
    ['Performance et fiabilité', `Le **démarrage à froid** arrive quand une nouvelle instance s'initialise. On le réduit avec un petit paquet, SnapStart ou la **Provisioned Concurrency**. Pour les événements asynchrones, prévois une **file d'échec (DLQ)**, et rends le traitement **idempotent** : un même message peut arriver deux fois.

Plus de mémoire signifie aussi plus de CPU. **Lambda Power Tuning** trouve le meilleur réglage.`, `import os, boto3
table = boto3.resource("dynamodb").Table(os.environ["TABLE"])  # hors handler : réutilisé

def handler(event, context):
    echecs = []
    for r in event["Records"]:
        try:
            table.put_item(
                Item={"id": r["messageId"], "body": r["body"]},
                ConditionExpression="attribute_not_exists(id)",  # idempotence
            )
        except table.meta.client.exceptions.ConditionalCheckFailedException:
            pass
        except Exception:
            echecs.append({"itemIdentifier": r["messageId"]})
    return {"batchItemFailures": echecs}  # seuls les échecs sont rejoués`, 'python', 'Une Lambda dans un VPC a besoin d\'une NAT ou d\'endpoints pour joindre Internet et les services AWS.'],
  ]],
  lab: {
    ctx: 'Crée, déploie et observe une fonction avec SAM.',
    real: ['Workshops AWS Serverless', 'https://workshops.aws/categories/Serverless'],
    prompt: 'dev@laptop:~/api$',
    steps: [
      ['Compile le projet.', '^sam build', 'sam build', 'Build Succeeded'],
      ['Teste localement la fonction `Api` avec `event.json`.', '^sam local invoke Api .*(-e|--event) event\\.json', 'sam local invoke Api -e event.json', 'REPORT Duration: 12.40 ms Memory Size: 512 MB\n{"statusCode":200,"body":"{\\"message\\":\\"Bonjour monde\\"}"}'],
      ['Déploie.', '^sam deploy', 'sam deploy', 'Successfully created/updated stack - api in eu-west-3'],
      ['Suis les logs en direct de la stack `api`.', '^sam logs .*(--stack-name|-n).*(--tail|-t)|^sam logs .*(--tail|-t)', 'sam logs --stack-name api --tail', 'START RequestId: 7c1f…\nEND RequestId: 7c1f…\nREPORT Duration: 8.12 ms Billed Duration: 9 ms'],
    ],
  },
  quiz: [
    ['Qu\'est-ce qu\'un démarrage à froid ?', ['Le temps d\'initialisation d\'une nouvelle instance', 'Une panne d\'AWS', 'Un cache', 'Un type de base'], 0, 'Il ne touche que les nouvelles instances.'],
    ['Pourquoi créer le client hors du handler ?', ['Pour le réutiliser entre appels', 'Pour le chiffrer', 'Pour changer de région', 'C\'est interdit'], 0, 'L\'instance reste en vie entre deux appels.'],
    ['Pourquoi rendre le traitement idempotent ?', ['Un message peut être livré plusieurs fois', 'Pour réduire la facture DNS', 'Pour accélérer Python', 'Pour éviter HTTPS'], 0, 'SQS garantit « au moins une fois ».'],
    ['Augmenter la mémoire d\'une Lambda a quel effet ?', ['Elle reçoit aussi plus de CPU', 'Aucun', 'Elle devient gratuite', 'Elle perd son rôle'], 0, 'Le temps d\'exécution peut baisser au point de réduire le coût.'],
  ],
  project: {
    t: 'Redimensionneur d\'images',
    b: 'Crée un traitement événementiel complet. Le niveau gratuit suffit pour de petits volumes.',
    s: ['Déclencher une Lambda à chaque dépôt dans un bucket', 'Générer des miniatures dans un second bucket', 'Stocker les métadonnées dans DynamoDB', 'Ajouter une file SQS et une DLQ', 'Tracer avec X-Ray ou OpenTelemetry', 'Déployer avec SAM depuis la CI'],
    d: 'une image déposée produit sa miniature en quelques secondes et un fichier corrompu arrive dans la DLQ.',
  },
  links: [
    ['Guide du développeur Lambda', 'https://docs.aws.amazon.com/lambda/latest/dg/welcome.html', 'doc'],
    ['AWS SAM', 'https://docs.aws.amazon.com/serverless-application-model/', 'doc'],
    ['Serverless Land', 'https://serverlessland.com/', 'lab'],
    ['Lambda Power Tuning', 'https://github.com/alexcasalboni/aws-lambda-power-tuning', 'repo'],
  ],
});

M({
  id: 'azfunc', name: 'Azure Functions', stage: 'serverless', mono: 'Fn', h: 7, sim: 'serverless', simCfg: { platform: 'Azure Functions' }, pre: ['azure'],
  pitch: 'Les fonctions serverless d\'Azure, avec des liaisons qui évitent le code d\'intégration.',
  l: [[
    ['Déclencheurs et liaisons', `Une fonction a un **trigger** et des **bindings** : des entrées et sorties déclarées qui évitent d'écrire le code de connexion. **Core Tools** permet de tout lancer en local.`, `import azure.functions as func

app = func.FunctionApp(http_auth_level=func.AuthLevel.FUNCTION)

@app.route(route="bonjour")
def bonjour(req: func.HttpRequest) -> func.HttpResponse:
    nom = req.params.get("nom", "monde")
    return func.HttpResponse(f"Bonjour {nom}")

@app.queue_trigger(arg_name="msg", queue_name="commandes", connection="Storage")
@app.blob_output(arg_name="sortie", path="factures/{id}.json", connection="Storage")
def traiter(msg: func.QueueMessage, sortie: func.Out[str]):
    sortie.set(msg.get_body().decode())`, 'python'],
  ], [
    ['Plans d\'hébergement', `Le plan **Flex Consumption** ajuste les instances et réduit les démarrages à froid. Le plan **Premium** garde des instances chaudes. Les **deployment slots** permettent de tester une version puis d'échanger sans coupure.`, `func init api --python
func new --template "HTTP trigger" --name bonjour
func start

az functionapp create -g rg-api -n func-boutique \\
  --flexconsumption-location francecentral \\
  --runtime python --runtime-version 3.12 \\
  --storage-account stboutique
func azure functionapp publish func-boutique`, 'bash'],
  ], [
    ['Durable Functions', `**Durable Functions** écrit des workflows avec état en code : enchaînement, parallélisme, attente d'un événement humain. Azure conserve l'état et reprend là où le flux s'était arrêté.`, `import azure.durable_functions as df

dfapp = df.DFApp()

@dfapp.orchestration_trigger(context_name="ctx")
def commande(ctx):
    paiement = yield ctx.call_activity("payer", ctx.get_input())
    colis = [ctx.call_activity("preparer", a) for a in paiement["articles"]]
    yield ctx.task_all(colis)              # parallèle
    ok = yield ctx.wait_for_external_event("validation")  # attente humaine
    return ok`, 'python'],
  ]],
  lab: {
    ctx: 'Crée et publie une fonction HTTP avec Core Tools.',
    prompt: 'dev@laptop:~$',
    steps: [
      ['Initialise le projet Python `api`.', '^func init api .*--python|^func init api .*--worker-runtime python', 'func init api --python', 'Writing host.json\nWriting local.settings.json'],
      ['Ajoute un déclencheur HTTP nommé `bonjour`.', '^func new .*bonjour', 'func new --template "HTTP trigger" --name bonjour', 'The function "bonjour" was created successfully'],
      ['Lance-la en local.', '^func start', 'func start', 'Functions:\n  bonjour: [GET,POST] http://localhost:7071/api/bonjour'],
      ['Publie-la sur `func-boutique`.', '^func azure functionapp publish func-boutique', 'func azure functionapp publish func-boutique', 'Deployment successful.'],
    ],
  },
  quiz: [
    ['À quoi sert un binding ?', ['Déclarer une entrée ou sortie sans code d\'intégration', 'Chiffrer un disque', 'Créer un VNet', 'Gérer des factures'], 0, 'Le runtime se charge de la connexion.'],
    ['Que permet Durable Functions ?', ['Des workflows longs avec état', 'Du stockage d\'images', 'Du DNS', 'Du monitoring seulement'], 0, 'L\'état est persisté entre les étapes.'],
    ['À quoi sert un deployment slot ?', ['Tester une version puis l\'échanger sans coupure', 'Multiplier les factures', 'Supprimer le cache', 'Gérer le réseau'], 0, 'Le swap est quasi instantané.'],
  ],
  project: {
    t: 'Traitement de commandes',
    b: 'Modélise un flux de commande complet avec Durable Functions.',
    s: ['Recevoir la commande par HTTP', 'Placer le message dans une file', 'Orchestrer paiement et préparation en parallèle', 'Attendre une validation humaine', 'Superviser avec Application Insights'],
    d: 'un redémarrage en cours de flux reprend exactement là où il s\'était arrêté.',
  },
  links: [
    ['Documentation Azure Functions', 'https://learn.microsoft.com/fr-fr/azure/azure-functions/', 'doc'],
    ['Durable Functions', 'https://learn.microsoft.com/fr-fr/azure/azure-functions/durable/durable-functions-overview', 'doc'],
    ['Exemples officiels', 'https://github.com/Azure/azure-functions-python-worker', 'repo'],
  ],
});

M({
  id: 'cloudflare', name: 'Cloudflare', stage: 'serverless', icon: 'cloudflare', h: 8, sim: 'serverless', simCfg: { platform: 'Cloudflare Workers' }, pre: ['nginx'],
  simIntro: 'Les Workers tournent sur des isolats et démarrent presque instantanément, mais le compromis entre usage, coût et charge constante reste le même. Explore-le ici.',
  pitch: 'Un réseau mondial pour le CDN, la sécurité, et le code exécuté au plus près des visiteurs.',
  l: [[
    ['Proxy, DNS et CDN', `Quand tu confies ton DNS à Cloudflare, le trafic passe par son réseau. Il met en cache, absorbe les attaques et fournit le TLS. Le nuage orange indique un enregistrement proxifié, le gris un DNS simple.`, `curl -sI https://exemple.fr | grep -iE "server|cf-cache-status|cf-ray"
# server: cloudflare
# cf-cache-status: HIT

dig +short exemple.fr     # renvoie les IP de Cloudflare`, 'bash'],
  ], [
    ['Workers', `Un **Worker** exécute du JavaScript sur le réseau de Cloudflare, près de l'utilisateur, avec un démarrage quasi instantané grâce aux isolats V8. **KV**, **R2** et **D1** apportent stockage clé-valeur, objets et SQL.`, `export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/compteur") {
      const n = Number(await env.KV.get("n") ?? 0) + 1;
      await env.KV.put("n", String(n));
      return Response.json({ n, region: req.cf?.colo });
    }
    return fetch(req);
  },
};
// npx wrangler deploy`, 'javascript'],
  ], [
    ['Zero Trust et résilience', `**Cloudflare Tunnel** publie un service sans ouvrir de port entrant. **Access** place une authentification devant une application interne. **Durable Objects** fournit de la coordination avec état, et le **WAF** bloque les attaques applicatives.`, `cloudflared tunnel login
cloudflared tunnel create interne
cloudflared tunnel route dns interne grafana.acme.fr

# ~/.cloudflared/config.yml
# tunnel: interne
# ingress:
#   - hostname: grafana.acme.fr
#     service: http://localhost:3000
#   - service: http_status:404
cloudflared tunnel run interne`, 'bash'],
  ]],
  lab: {
    ctx: 'Publie un Worker avec Wrangler et ajoute-lui un stockage clé-valeur.',
    prompt: 'dev@laptop:~/edge$',
    steps: [
      ['Crée un projet avec `npm create cloudflare`.', '^npm create cloudflare', 'npm create cloudflare@latest', 'Application created: edge'],
      ['Lance-le en local.', '^(npx )?wrangler dev', 'npx wrangler dev', 'Ready on http://localhost:8787'],
      ['Crée l\'espace KV nommé `KV`.', '^(npx )?wrangler kv namespace create KV', 'npx wrangler kv namespace create KV', 'Add the following to your configuration file:\n[[kv_namespaces]]\nbinding = "KV"'],
      ['Déploie.', '^(npx )?wrangler deploy', 'npx wrangler deploy', 'Deployed edge triggers\n  https://edge.acme.workers.dev'],
      ['Regarde les logs en direct.', '^(npx )?wrangler tail', 'npx wrangler tail', 'GET https://edge.acme.workers.dev/compteur - Ok'],
    ],
  },
  quiz: [
    ['Pourquoi un Worker démarre-t-il si vite ?', ['Il utilise des isolats V8', 'Il garde une VM par client', 'Il n\'exécute pas de code', 'Il se lance sur le navigateur'], 0, 'Un isolat est beaucoup plus léger qu\'un conteneur.'],
    ['Que permet Cloudflare Tunnel ?', ['Exposer un service sans port entrant', 'Compiler le code', 'Gérer les factures', 'Remplacer Git'], 0, 'Le connecteur ouvre une connexion sortante.'],
    ['Quelle différence entre nuage orange et gris ?', ['Orange passe par le proxy, gris fait seulement du DNS', 'Aucune', 'Le gris chiffre plus', 'L\'orange supprime TLS'], 0, 'En gris, ton IP d\'origine est visible.'],
  ],
  project: {
    t: 'Site résilient sans serveur',
    b: 'Protège un site et exécute de la logique à la périphérie. Le plan gratuit suffit.',
    s: ['Déplacer un domaine sur Cloudflare', 'Mettre en cache les pages statiques', 'Ajouter un Worker d\'A/B test', 'Exposer Grafana local avec un Tunnel', 'Protéger ce Grafana avec Access'],
    d: 'Grafana est joignable sans aucun port ouvert et uniquement après authentification.',
  },
  links: [
    ['Documentation Cloudflare', 'https://developers.cloudflare.com/', 'doc'],
    ['Workers', 'https://developers.cloudflare.com/workers/', 'doc'],
    ['Cloudflare Tunnel', 'https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/', 'doc'],
    ['Learning Center', 'https://www.cloudflare.com/fr-fr/learning/', 'cours'],
  ],
});

M({
  id: 'vercel', name: 'Vercel', stage: 'serverless', icon: 'vercel', h: 4, sim: 'serverless', simCfg: { platform: 'Vercel Functions' }, pre: ['git'],
  pitch: 'La plateforme frontend : un push, une URL de prévisualisation, un déploiement mondial.',
  l: [[
    ['Déployer depuis Git', `Connecte un dépôt : chaque push construit le site, chaque branche reçoit une **URL de prévisualisation**, et \`main\` part en production. Le framework est détecté automatiquement.`, `npm i -g vercel
vercel          # aperçu
vercel --prod   # production
vercel logs https://boutique.vercel.app
vercel env add DATABASE_URL production`, 'bash'],
  ], [
    ['Fonctions et rendu', `Tout fichier dans \`api/\` devient une fonction. Le choix du rendu compte : statique, à la demande, ou régénéré en arrière-plan (ISR), qui combine vitesse et fraîcheur.`, `// api/produits.js
export default async function handler(req, res) {
  const produits = await fetch(process.env.API_URL).then(r => r.json());
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  res.status(200).json(produits);
}`, 'javascript'],
  ], [
    ['Observabilité et coûts', `En production, contrôle les **Core Web Vitals**, active le **Skew Protection** pour éviter les décalages entre client et serveur pendant un déploiement, et surveille l'usage. Les **rollbacks instantanés** repointent la production vers un build précédent, sans reconstruire.`, `vercel ls                       # déploiements
vercel promote <url-deploiement> # promouvoir un build
vercel rollback                  # revenir au précédent`, 'bash', 'La facturation dépend de l\'usage. Configure des limites de dépenses avant qu\'un trafic imprévu ne le fasse pour toi.'],
  ]],
  lab: {
    ctx: 'Déploie un site, ajoute une variable, puis annule une mauvaise version.',
    prompt: 'dev@laptop:~/site$',
    steps: [
      ['Lie le projet local à Vercel.', '^vercel link', 'vercel link', 'Linked to acme/site'],
      ['Crée un déploiement d\'aperçu.', '^vercel$|^vercel deploy$', 'vercel', 'Preview: https://site-git-feat-acme.vercel.app'],
      ['Déploie en production.', '^vercel (deploy )?--prod', 'vercel --prod', 'Production: https://site.vercel.app'],
      ['Reviens à la version précédente.', '^vercel rollback', 'vercel rollback', 'Success! site.vercel.app now points to the previous deployment'],
    ],
  },
  quiz: [
    ['Que génère chaque branche ?', ['Une URL de prévisualisation', 'Un nouveau domaine payant', 'Une base de données', 'Un cluster'], 0, 'Parfait pour relire une PR en conditions réelles.'],
    ['Que fait un rollback instantané ?', ['Repointe vers un build déjà prêt', 'Reconstruit tout', 'Supprime le projet', 'Change le DNS'], 0, 'Il n\'y a pas de nouvelle compilation.'],
    ['Que signifie ISR ?', ['Une page statique régénérée en arrière-plan', 'Un type de VPN', 'Un protocole DNS', 'Une base'], 0, 'Elle combine rapidité et données fraîches.'],
  ],
  project: {
    t: 'Vitrine avec prévisualisations',
    b: 'Publie un site Next.js ou Astro dont chaque PR se relit sur une vraie URL.',
    s: ['Connecter le dépôt', 'Ajouter une fonction API avec cache', 'Séparer les variables de preview et de production', 'Protéger les aperçus', 'Exercer un rollback'],
    d: 'une PR affiche automatiquement son URL et la production revient en arrière en quelques secondes.',
  },
  links: [
    ['Documentation Vercel', 'https://vercel.com/docs', 'doc'],
    ['Exemples Vercel', 'https://github.com/vercel/examples', 'repo'],
    ['Limites et tarifs', 'https://vercel.com/docs/limits', 'doc'],
  ],
});

M({
  id: 'netlify', name: 'Netlify', stage: 'serverless', icon: 'netlify', h: 4, sim: 'serverless', simCfg: { platform: 'Netlify Functions' }, pre: ['git'],
  pitch: 'L\'hébergement Jamstack : sites, formulaires et fonctions déployés depuis Git.',
  l: [[
    ['Configurer un site', `Le fichier \`netlify.toml\` décrit le build, les redirections et les en-têtes dans le dépôt. Chaque PR produit un **Deploy Preview**.`, `[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"`, 'toml'],
  ], [
    ['Functions et Edge Functions', `Les **Functions** tournent sur AWS Lambda et les **Edge Functions** sur Deno, à la périphérie. **Netlify Forms** capture des formulaires sans backend et **Identity** gère des utilisateurs simples.`, `// netlify/functions/bonjour.mjs
export default async (req) => {
  const nom = new URL(req.url).searchParams.get("nom") ?? "monde";
  return Response.json({ message: \`Bonjour \${nom}\` });
};
export const config = { path: "/api/bonjour" };`, 'javascript'],
  ], [
    ['Contextes et déploiements atomiques', `Chaque déploiement est **atomique** : tous les fichiers changent en même temps, et un retour arrière est immédiat. Les **contextes** adaptent la configuration à la production, aux aperçus et aux branches. Le **Split Testing** partage le trafic entre branches.`, `[context.production]
  environment = { NODE_ENV = "production" }

[context.deploy-preview]
  command = "npm run build:preview"

# netlify deploy --build        # brouillon
# netlify deploy --build --prod # production`, 'toml'],
  ]],
  lab: {
    ctx: 'Publie un site avec la CLI Netlify.',
    prompt: 'dev@laptop:~/site$',
    steps: [
      ['Lie le dossier à un site.', '^(netlify|ntl) (init|link)', 'netlify init', 'Success! Site linked: boutique-acme'],
      ['Lance l\'environnement local.', '^(netlify|ntl) dev', 'netlify dev', 'Server now ready on http://localhost:8888'],
      ['Crée un déploiement brouillon.', '^(netlify|ntl) deploy( --build)?$', 'netlify deploy --build', 'Website draft URL: https://65ab--boutique-acme.netlify.app'],
      ['Déploie en production.', '^(netlify|ntl) deploy .*--prod', 'netlify deploy --build --prod', 'Deployed to production URL: https://boutique-acme.netlify.app'],
    ],
  },
  quiz: [
    ['Que signifie un déploiement atomique ?', ['Tous les fichiers changent en même temps', 'Le site est chiffré', 'Le déploiement est nucléaire', 'Un seul fichier est publié'], 0, 'Un visiteur ne voit jamais un mélange de versions.'],
    ['Où décrire build et redirections ?', ['Dans `netlify.toml`', 'Dans `.bashrc`', 'Dans `hosts`', 'Dans le DNS'], 0, 'La configuration suit le code.'],
    ['Sur quoi tournent les Edge Functions ?', ['Sur Deno, à la périphérie', 'Sur Windows Server', 'Dans le navigateur', 'Sur Jenkins'], 0, 'Elles s\'exécutent près du visiteur.'],
  ],
  project: {
    t: 'Site Jamstack complet',
    b: 'Publie un site de contenu avec un peu de logique côté serveur.',
    s: ['Générer un site avec Astro ou Hugo', 'Décrire la configuration dans `netlify.toml`', 'Ajouter un formulaire de contact', 'Écrire une fonction qui appelle une API externe', 'Tester un split entre deux branches'],
    d: 'chaque PR publie un aperçu et le formulaire fonctionne sans serveur à toi.',
  },
  links: [
    ['Documentation Netlify', 'https://docs.netlify.com/', 'doc'],
    ['Netlify Functions', 'https://docs.netlify.com/build/functions/overview/', 'doc'],
    ['Jamstack', 'https://jamstack.org/', 'cours'],
  ],
});
