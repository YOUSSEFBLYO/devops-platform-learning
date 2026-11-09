M({
  id: 'prometheus', name: 'Prometheus', stage: 'monitoring', icon: 'prometheus', h: 14, sim: 'metrics', pre: ['k8s'],
  pitch: 'La référence open source des métriques : il collecte, stocke et déclenche les alertes.',
  l: [[
    ['Collecter par scrape', `Prometheus **va chercher** les métriques sur \`/metrics\` à intervalle régulier. Chaque série a un nom et des **labels**. Il y a quatre types : \`counter\`, \`gauge\`, \`histogram\`, \`summary\`.`, `# prometheus.yml
global:
  scrape_interval: 15s
scrape_configs:
  - job_name: node
    static_configs:
      - targets: ["node-exporter:9100"]

# Exemple de sortie /metrics :
# http_requests_total{method="GET",status="200"} 10432
# http_requests_total{method="GET",status="500"} 7`, 'yaml', 'Ne mets jamais un identifiant utilisateur en label : chaque valeur crée une série, ce qui fait exploser la mémoire.'],
  ], [
    ['PromQL', `\`rate()\` calcule une vitesse par seconde sur un compteur. \`sum by\` regroupe. \`histogram_quantile\` donne un percentile à partir des buckets.`, `# Requêtes par seconde
sum(rate(http_requests_total[5m]))

# Taux d'erreur en %
100 * sum(rate(http_requests_total{status=~"5.."}[5m]))
    / sum(rate(http_requests_total[5m]))

# Latence p99 par service
histogram_quantile(0.99,
  sum by (le, service)(rate(http_request_duration_seconds_bucket[5m])))

# Disque plein dans 4 h ?
predict_linear(node_filesystem_avail_bytes[6h], 4 * 3600) < 0`, 'promql'],
    ['Alertes', `Une **règle** évalue une expression. Après la durée \`for\`, l'alerte passe en Firing et **Alertmanager** la route vers Slack ou PagerDuty, en regroupant et en dédupliquant. Alerte sur les symptômes vus par l'utilisateur, pas sur chaque métrique système.`, `groups:
  - name: api
    rules:
      - alert: TauxErreurEleve
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m]))
            / sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels: { severity: page }
        annotations:
          summary: "Plus de 5 % d'erreurs sur l'API"
          runbook_url: https://wiki.acme.fr/runbooks/erreurs-api`, 'yaml'],
  ], [
    ['Kubernetes et long terme', `Le chart **kube-prometheus-stack** installe tout, et les **ServiceMonitor** déclarent les cibles. Un Prometheus garde peu d'historique : pour le long terme et la haute disponibilité, on utilise **Thanos** ou **Mimir** avec \`remote_write\`.

Les **recording rules** précalculent les requêtes coûteuses.`, `apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata: { name: api, labels: { release: kube-prometheus-stack } }
spec:
  selector: { matchLabels: { app: api } }
  endpoints: [{ port: http, path: /metrics, interval: 15s }]
---
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata: { name: slo-api }
spec:
  groups:
    - name: enregistrements
      rules:
        - record: service:http_errors:ratio_rate5m
          expr: sum by (service)(rate(http_requests_total{status=~"5.."}[5m])) / sum by (service)(rate(http_requests_total[5m]))`, 'yaml'],
  ]],
  lab: {
    ctx: 'Valide tes règles et interroge Prometheus avec `promtool`.',
    real: ['PromLabs, PromQL interactif', 'https://promlabs.com/promql-cheat-sheet/'],
    prompt: 'ops@monitoring:~$',
    steps: [
      ['Valide la configuration `prometheus.yml`.', '^promtool check config prometheus\\.yml', 'promtool check config prometheus.yml', 'SUCCESS: prometheus.yml is valid prometheus config file syntax'],
      ['Valide les règles `rules.yml`.', '^promtool check rules rules\\.yml', 'promtool check rules rules.yml', 'SUCCESS: 3 rules found'],
      ['Teste les règles avec `tests.yml`.', '^promtool test rules tests\\.yml', 'promtool test rules tests.yml', 'SUCCESS'],
      ['Interroge le taux de requêtes en instantané sur `http://localhost:9090`.', '^promtool query instant http://localhost:9090 .*rate\\(http_requests_total', "promtool query instant http://localhost:9090 'sum(rate(http_requests_total[5m]))'", '{} => 142.8 @[1793437200]'],
      ['Recharge la configuration avec `curl` sur `/-/reload`.', '^curl .*-X ?POST.*/-/reload', 'curl -X POST http://localhost:9090/-/reload', ''],
    ],
  },
  quiz: [
    ['Comment Prometheus obtient-il les métriques ?', ['Il les interroge (pull)', 'Les applications lui envoient un mail', 'Par FTP', 'Par Git'], 0, 'Le modèle pull simplifie la détection d\'une cible en panne.'],
    ['Pourquoi utiliser `rate()` sur un counter ?', ['Un compteur ne fait qu\'augmenter', 'Pour le chiffrer', 'Pour réduire les labels', 'C\'est interdit autrement'], 0, 'On s\'intéresse à sa vitesse d\'évolution.'],
    ['Quel est le danger d\'un label avec trop de valeurs ?', ['Une explosion de la cardinalité', 'Un bug DNS', 'Une perte de TLS', 'Rien du tout'], 0, 'Chaque combinaison est une série en mémoire.'],
    ['Quel composant route les notifications ?', ['Alertmanager', 'Grafana Loki', 'node_exporter', 'kubelet'], 0, 'Il groupe, déduplique et met en silence.'],
    ['Comment conserver des métriques plusieurs années ?', ['Avec Thanos ou Mimir', 'En augmentant `scrape_interval`', 'Avec Bash', 'C\'est impossible'], 0, 'Ils utilisent un stockage objet.'],
  ],
  project: {
    t: 'Supervision d\'un cluster',
    b: 'Installe une pile complète sur ton cluster local.',
    s: ['Installer kube-prometheus-stack avec Helm', 'Instrumenter une API et créer un ServiceMonitor', 'Créer des recording rules et des alertes testées', 'Router vers Slack ou un webhook local', 'Créer un runbook pour chaque alerte', 'Déclencher une panne et suivre l\'alerte de bout en bout'],
    d: 'une panne provoquée génère une seule notification claire, avec un lien vers le runbook.',
    x: 'Ajoute Mimir pour le long terme et une alerte sur le budget d\'erreur.',
  },
  links: [
    ['Documentation Prometheus', 'https://prometheus.io/docs/introduction/overview/', 'doc'],
    ['PromLabs, aide-mémoire PromQL', 'https://promlabs.com/promql-cheat-sheet/', 'doc'],
    ['Awesome Prometheus Alerts', 'https://samber.github.io/awesome-prometheus-alerts/', 'repo'],
    ['kube-prometheus-stack', 'https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack', 'repo'],
    ['Thanos', 'https://thanos.io/', 'doc'],
  ],
});

M({
  id: 'grafana', name: 'Grafana', stage: 'monitoring', icon: 'grafana', h: 8, sim: 'metrics', simCfg: { q: 'avg(rate(http_request_duration_seconds_sum[5m])) / avg(rate(http_request_duration_seconds_count[5m]))' }, pre: ['prometheus'],
  simIntro: 'Le panneau ci-dessous se comporte comme un panneau Grafana avec une règle d\'alerte. Règle le seuil et la durée, provoque un incident et observe le passage de Pending à Firing.',
  pitch: 'Le tableau de bord universel, relié à toutes tes sources de données.',
  l: [[
    ['Sources et panneaux', `Grafana se connecte à une **data source** comme Prometheus, Loki ou Elasticsearch. Un **dashboard** contient des **panels**. Les **variables** créent des listes déroulantes qui rendent un tableau réutilisable.`, `docker run -d -p 3000:3000 --name grafana grafana/grafana

# Exemple de requête dans un panneau, avec variable de service
sum(rate(http_requests_total{service="$service"}[$__rate_interval]))`, 'bash', 'Un bon tableau répond à une question. Commence par la méthode RED : Rate, Errors, Duration.'],
  ], [
    ['Provisioning et alertes', `Ne configure pas à la main : les sources et tableaux se décrivent en fichiers. Le **provisioning** les charge au démarrage. Les alertes unifiées passent par des **contact points** et des **notification policies**.`, `# provisioning/datasources/prom.yaml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090
    isDefault: true

# provisioning/dashboards/default.yaml
apiVersion: 1
providers:
  - name: equipe
    options:
      path: /var/lib/grafana/dashboards`, 'yaml'],
  ], [
    ['Tableaux en code et corrélation', `**Jsonnet** avec Grafonnet, ou l'opérateur Grafana, versionnent les tableaux. Les **exemplars** et les **derived fields** relient une métrique à une trace puis aux logs : on passe d'un pic de latence à la requête exacte en deux clics.`, `# values Helm : relier Loki à Tempo via trace_id
datasources:
  datasources.yaml:
    apiVersion: 1
    datasources:
      - name: Loki
        type: loki
        url: http://loki:3100
        jsonData:
          derivedFields:
            - name: trace_id
              matcherRegex: 'trace_id=(\\w+)'
              url: '$\${__value.raw}'
              datasourceUid: tempo`, 'yaml'],
  ]],
  lab: {
    ctx: 'Lance Grafana avec une configuration provisionnée.',
    real: ['Tutoriels Grafana', 'https://grafana.com/tutorials/'],
    prompt: 'ops@laptop:~/grafana$',
    steps: [
      ['Lance `grafana/grafana` nommé `grafana`, port 3000, avec `./provisioning` monté sur `/etc/grafana/provisioning`.', '^docker run .*(\\./provisioning|\\$\\(?pwd\\)?/provisioning):/etc/grafana/provisioning.*grafana/grafana', 'docker run -d --name grafana -p 3000:3000 -v ./provisioning:/etc/grafana/provisioning grafana/grafana', 'a1f7c0de99b2'],
      ['Vérifie l\'état de l\'API.', '^curl .*/api/health', 'curl http://localhost:3000/api/health', '{ "database": "ok", "version": "12.2.0" }'],
      ['Liste les extensions installées avec `grafana cli`.', '^docker exec grafana grafana cli plugins ls', 'docker exec grafana grafana cli plugins ls', 'installed plugins:\ngrafana-lokiexplore-app'],
    ],
  },
  quiz: [
    ['À quoi servent les variables ?', ['Rendre un tableau réutilisable', 'Stocker des mots de passe', 'Remplacer PromQL', 'Lancer des conteneurs'], 0, 'Un même tableau couvre tous les services.'],
    ['Pourquoi le provisioning ?', ['Pour versionner sources et tableaux', 'Pour colorer les panneaux', 'Pour chiffrer le disque', 'Pour accélérer Docker'], 0, 'Grafana devient reproductible.'],
    ['Que permettent les exemplars ?', ['Lier un point de métrique à une trace', 'Créer des comptes', 'Compresser les données', 'Installer des plugins'], 0, 'On passe du symptôme à la requête exacte.'],
  ],
  project: {
    t: 'Tableaux de bord en code',
    b: 'Construis le tableau RED de ton API.',
    s: ['Créer un tableau Rate, Errors, Duration', 'Ajouter une variable de service', 'Provisionner source et tableau depuis Git', 'Créer une alerte avec notification', 'Relier les métriques aux logs'],
    d: 'un Grafana neuf affiche tout dès son démarrage, sans action manuelle.',
  },
  links: [
    ['Documentation Grafana', 'https://grafana.com/docs/grafana/latest/', 'doc'],
    ['Tutoriels Grafana', 'https://grafana.com/tutorials/', 'cours'],
    ['Tableaux de la communauté', 'https://grafana.com/grafana/dashboards/', 'doc'],
    ['Play Grafana', 'https://play.grafana.org/', 'lab'],
  ],
});

M({
  id: 'zabbix', name: 'Zabbix', stage: 'monitoring', mono: 'Zb', h: 8, sim: 'metrics', simCfg: { q: 'avg(/web-01/system.cpu.util,5m)' }, pre: ['linux'],
  simIntro: 'Zabbix évalue des triggers plutôt que des règles PromQL, mais l\'idée reste la même : seuil, durée et problème qui se résout. La formule affichée suit sa syntaxe.',
  pitch: 'La supervision classique des serveurs, équipements réseau et applications, avec agents et SNMP.',
  l: [[
    ['Hosts, items, triggers', `Un **host** est une machine surveillée. Un **item** collecte une valeur, un **trigger** définit quand il y a un problème, et une **action** notifie. Les **templates** regroupent le tout.`, `# Installer l'agent sur Ubuntu
sudo apt install zabbix-agent2
sudo sed -i 's/^Server=.*/Server=10.0.0.50/' /etc/zabbix/zabbix_agent2.conf
sudo systemctl enable --now zabbix-agent2

zabbix_agent2 -t system.cpu.load[all,avg1]   # tester une clé`, 'bash'],
  ], [
    ['Découverte et SNMP', `La **découverte réseau** ajoute automatiquement de nouveaux hôtes. Le **low-level discovery** crée des items pour chaque disque ou interface. Pour les équipements réseau, Zabbix interroge en **SNMP**.`, `# Expression de trigger : CPU > 90 % pendant 5 minutes
avg(/web-01/system.cpu.util,5m)>90

# Espace disque sous 10 %
last(/web-01/vfs.fs.size[/,pfree])<10

# snmpwalk -v2c -c public 10.0.0.1 1.3.6.1.2.1.1`, 'text'],
  ], [
    ['Proxies et API', `À grande échelle, les **proxies** collectent à distance et tamponnent les données. **TimescaleDB** améliore le stockage. L'**API JSON-RPC** automatise la création d'hôtes, et les dépendances entre triggers évitent les tempêtes d'alertes.`, `curl -s -X POST https://zabbix.acme.fr/api_jsonrpc.php \\
  -H 'Content-Type: application/json-rpc' \\
  -H "Authorization: Bearer $ZABBIX_TOKEN" \\
  -d '{"jsonrpc":"2.0","method":"host.get","params":{"output":["hostid","host"]},"id":1}'`, 'bash'],
  ]],
  lab: {
    ctx: 'Installe un agent et vérifie qu\'il remonte les données.',
    real: ['Documentation Zabbix', 'https://www.zabbix.com/documentation/current/en/manual'],
    prompt: 'root@web-01:~#',
    steps: [
      ['Installe `zabbix-agent2`.', '^apt(-get)? install .*zabbix-agent2', 'apt install -y zabbix-agent2', 'Setting up zabbix-agent2 ...'],
      ['Active et démarre le service.', '^systemctl enable --now zabbix-agent2', 'systemctl enable --now zabbix-agent2', ''],
      ['Teste la clé `system.cpu.load[all,avg1]` avec l\'agent.', '^zabbix_agent2 -t system\\.cpu\\.load', 'zabbix_agent2 -t system.cpu.load[all,avg1]', 'system.cpu.load[all,avg1] [s|0.120000]'],
      ['Depuis le serveur, interroge l\'agent `10.0.0.11` avec `zabbix_get`.', '^zabbix_get -s 10\\.0\\.0\\.11 -k', 'zabbix_get -s 10.0.0.11 -k agent.ping', '1'],
    ],
  },
  quiz: [
    ['Qu\'est-ce qu\'un trigger ?', ['Une condition qui définit un problème', 'Une image', 'Un agent', 'Un groupe'], 0, 'Il s\'évalue sur les valeurs collectées.'],
    ['Quel protocole supervise un commutateur réseau ?', ['SNMP', 'SMTP', 'NFS', 'FTP'], 0, 'Les équipements réseau exposent leurs compteurs ainsi.'],
    ['Quel est le rôle d\'un proxy Zabbix ?', ['Collecter à distance et tamponner', 'Gérer le DNS', 'Afficher l\'interface', 'Chiffrer les disques'], 0, 'Il continue si le lien avec le serveur tombe.'],
  ],
  project: {
    t: 'Supervision d\'un petit parc',
    b: 'Déploie Zabbix avec Docker Compose et surveille tes VM.',
    s: ['Lancer serveur, interface et base', 'Installer les agents sur deux hôtes', 'Appliquer un template Linux', 'Créer un trigger et une notification', 'Automatiser l\'ajout d\'hôtes par API'],
    d: 'un service arrêté déclenche un problème et une notification, résolue automatiquement au redémarrage.',
  },
  links: [
    ['Manuel Zabbix', 'https://www.zabbix.com/documentation/current/en/manual', 'doc'],
    ['Intégrations Zabbix', 'https://www.zabbix.com/integrations', 'doc'],
    ['Blog Zabbix', 'https://blog.zabbix.com/', 'blog'],
  ],
});

M({
  id: 'datadog', name: 'Datadog', stage: 'monitoring', icon: 'datadog', h: 8, sim: 'metrics', simCfg: { q: 'avg(last_5m):avg:trace.http.request.duration{service:api} ' }, pre: ['docker'],
  simIntro: 'Un monitor Datadog suit la même logique : une requête, un seuil et une fenêtre d\'évaluation. Essaie de déclencher l\'alerte, puis de la résoudre.',
  pitch: 'Une plateforme SaaS qui réunit métriques, logs, traces et sécurité au même endroit.',
  l: [[
    ['Agent et tags', `L'**Agent** collecte sur l'hôte et envoie à Datadog. Tout repose sur les **tags** (\`env\`, \`service\`, \`version\`), qui relient métriques, logs et traces. C'est le **tagging unifié**.`, `docker run -d --name dd-agent \\
  -e DD_API_KEY=$DD_API_KEY -e DD_SITE=datadoghq.eu \\
  -e DD_ENV=prod -e DD_LOGS_ENABLED=true \\
  -v /var/run/docker.sock:/var/run/docker.sock:ro \\
  gcr.io/datadoghq/agent:7

docker exec dd-agent agent status`, 'bash'],
  ], [
    ['APM et monitors', `Les bibliothèques **APM** instrumentent le code automatiquement. Les **monitors** déclenchent des alertes, y compris par détection d'anomalie. **DogStatsD** envoie des métriques métier.`, `from datadog import statsd

statsd.increment("commandes.total", tags=["pays:fr"])
statsd.histogram("commandes.montant", 49.90)

# Lancer avec l'instrumentation automatique
# DD_SERVICE=api DD_ENV=prod ddtrace-run python app.py`, 'python'],
  ], [
    ['Coûts et monitors en code', `La facture dépend des hôtes, des logs indexés, des métriques personnalisées. Maîtrise-la : filtre les logs à l'ingestion, limite les tags à forte cardinalité. Les **monitors** et **SLO** se gèrent en Terraform avec le provider Datadog.`, `resource "datadog_monitor" "erreurs_api" {
  name    = "Taux d'erreur API"
  type    = "query alert"
  query   = "sum(last_5m):sum:trace.http.request.errors{service:api}.as_rate() / sum:trace.http.request.hits{service:api}.as_rate() > 0.05"
  message = "Trop d'erreurs. Runbook : https://wiki.acme.fr/erreurs @slack-astreinte"
  monitor_thresholds { critical = 0.05 }
  tags = ["service:api", "env:prod"]
}`, 'hcl', 'Un tag `user_id` sur une métrique personnalisée peut multiplier la facture. Vérifie le volume dans Metrics Summary.'],
  ]],
  lab: {
    ctx: 'Installe l\'agent en conteneur et contrôle la collecte.',
    real: ['Datadog Learning Center', 'https://learn.datadoghq.com/'],
    prompt: 'ops@web-01:~$',
    steps: [
      ['Lance l\'agent `gcr.io/datadoghq/agent:7` nommé `dd-agent`, avec `DD_API_KEY`.', '^docker run .*DD_API_KEY.*gcr\\.io/datadoghq/agent:7', 'docker run -d --name dd-agent -e DD_API_KEY=$DD_API_KEY gcr.io/datadoghq/agent:7', 'd9c0a1b2c3d4'],
      ['Affiche son état.', '^docker exec (-it )?dd-agent agent status', 'docker exec dd-agent agent status', 'Agent (v7.60.0)\n  Status: Running\n  API Keys status: API key ending with ab12: API Key valid'],
      ['Vérifie la configuration du check `nginx`.', '^docker exec (-it )?dd-agent agent check nginx', 'docker exec dd-agent agent check nginx', 'Instance ID: nginx:7c1f [OK]\nMetric Samples: Last Run: 7'],
    ],
  },
  quiz: [
    ['Pourquoi le tagging unifié ?', ['Pour relier métriques, logs et traces', 'Pour réduire la RAM', 'Pour chiffrer les logs', 'Pour faire du DNS'], 0, 'Les tags `env`, `service`, `version` sont partout.'],
    ['Qu\'est-ce qui fait exploser une facture ?', ['Des métriques à forte cardinalité', 'Un tableau de bord', 'Une couleur', 'Un monitor de plus'], 0, 'Chaque combinaison de tags compte.'],
    ['Comment gérer les monitors comme du code ?', ['Avec le provider Terraform', 'Avec un fichier Word', 'Avec SSH', 'C\'est impossible'], 0, 'Ils deviennent relus et versionnés.'],
  ],
  project: {
    t: 'Observabilité SaaS',
    b: 'Utilise l\'essai gratuit de 14 jours sur une application en conteneurs.',
    s: ['Déployer l\'agent et activer les logs', 'Instrumenter l\'API avec APM', 'Appliquer le tagging unifié', 'Créer un tableau de bord et un SLO', 'Décrire monitors et SLO en Terraform'],
    d: 'depuis une alerte, tu retrouves la trace et les logs de la requête en cause.',
  },
  links: [
    ['Documentation Datadog', 'https://docs.datadoghq.com/', 'doc'],
    ['Learning Center', 'https://learn.datadoghq.com/', 'cours'],
    ['Provider Terraform', 'https://registry.terraform.io/providers/DataDog/datadog/latest/docs', 'doc'],
  ],
});
