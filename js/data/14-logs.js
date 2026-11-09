M({
  id: 'elk', name: 'Elastic Stack (ELK)', stage: 'logs', icon: 'elastic', h: 12, sim: 'logs', simCfg: { lang: 'Façon KQL', ex: 'level:error service:payment' }, pre: ['docker'],
  pitch: 'Elasticsearch, Logstash et Kibana : indexer et explorer de très grands volumes de logs.',
  l: [[
    ['La chaîne', `**Beats** ou **Elastic Agent** collecte, **Logstash** transforme si besoin, **Elasticsearch** indexe et **Kibana** affiche. Chaque mot d'un log est indexé, ce qui permet une recherche en texte libre très rapide.`, `# filebeat.yml
filebeat.inputs:
  - type: filestream
    id: nginx
    paths: [/var/log/nginx/*.log]
output.elasticsearch:
  hosts: ["https://es:9200"]
  api_key: "\${ES_API_KEY}"

# Requête KQL dans Kibana
# service.name : "payment" and log.level : "error"`, 'yaml'],
  ], [
    ['Parser et structurer', `Un log structuré vaut mille regex. Écris tes logs en **JSON** si possible, sinon parse avec **Grok** ou les **ingest pipelines**. Le **mapping** définit le type de chaque champ : \`keyword\` pour filtrer, \`text\` pour la recherche.`, `# logstash.conf
filter {
  grok {
    match => { "message" => "%{COMBINEDAPACHELOG}" }
  }
  date { match => ["timestamp", "dd/MMM/yyyy:HH:mm:ss Z"] }
  geoip { source => "clientip" }
}
output {
  elasticsearch {
    hosts => ["https://es:9200"]
    data_stream => "true"
  }
}`, 'text'],
  ], [
    ['Cycle de vie et dimensionnement', `Les logs coûtent cher : **ILM** déplace les données de hot vers warm, cold puis les supprime. Les **data streams** gèrent le rollover. Les shards doivent rester entre 10 et 50 Go, et trop de petits shards dégradent le cluster.`, `PUT _ilm/policy/logs-30j
{
  "policy": { "phases": {
    "hot":    { "actions": { "rollover": { "max_primary_shard_size": "30gb", "max_age": "1d" } } },
    "warm":   { "min_age": "7d",  "actions": { "shrink": { "number_of_shards": 1 }, "forcemerge": { "max_num_segments": 1 } } },
    "delete": { "min_age": "30d", "actions": { "delete": {} } }
  } }
}`, 'json', 'Une mauvaise taille de JVM heap fait tomber les nœuds. Reste à 50 % de la RAM, sous 31 Go.'],
  ]],
  lab: {
    ctx: 'Interroge Elasticsearch avec `curl` pour diagnostiquer un cluster.',
    real: ['Elastic Labs', 'https://www.elastic.co/training/free'],
    prompt: 'ops@es-01:~$',
    steps: [
      ['Vérifie la santé du cluster sur `localhost:9200`.', '^curl .*localhost:9200/_cluster/health', 'curl -s localhost:9200/_cluster/health?pretty', '{ "status": "yellow", "number_of_nodes": 1, "unassigned_shards": 12 }'],
      ['Affiche les index avec `_cat/indices`.', '^curl .*/_cat/indices', 'curl -s "localhost:9200/_cat/indices?v&s=store.size:desc"', 'health index               docs.count store.size\nyellow logs-nginx-2026.11.02 8421000    12.4gb'],
      ['Demande la raison de non-allocation d\'un shard.', '^curl .*/_cluster/allocation/explain', 'curl -s localhost:9200/_cluster/allocation/explain?pretty', '"explanation": "a copy of this shard is already allocated to this node"'],
      ['Passe `number_of_replicas` à 0 sur `logs-*` : un seul nœud ne peut pas héberger de réplica.', '^curl .*-X ?PUT.*logs-\\*/_settings.*number_of_replicas.*0', `curl -X PUT "localhost:9200/logs-*/_settings" -H 'Content-Type: application/json' -d '{"index":{"number_of_replicas":0}}'`, '{ "acknowledged": true }'],
    ],
  },
  quiz: [
    ['Quel composant indexe les données ?', ['Elasticsearch', 'Kibana', 'Filebeat', 'Logstash'], 0, 'Kibana n\'est que l\'interface.'],
    ['Que signifie un cluster jaune ?', ['Des réplicas ne sont pas alloués', 'Tout est perdu', 'Le cluster est éteint', 'Tout va parfaitement'], 0, 'Les données primaires sont là, mais sans redondance.'],
    ['À quoi sert ILM ?', ['Gérer le cycle de vie des index', 'Compiler Grok', 'Chiffrer Kibana', 'Installer des agents'], 0, 'Il réduit les coûts de stockage.'],
    ['Pourquoi des logs JSON ?', ['Pour éviter le parsing fragile', 'Pour qu\'ils pèsent moins', 'Pour Windows', 'Par esthétique'], 0, 'Les champs arrivent déjà structurés.'],
  ],
  project: {
    t: 'Centrale de logs',
    b: 'Centralise les logs d\'une application en conteneurs.',
    s: ['Déployer Elasticsearch et Kibana avec Docker Compose', 'Collecter avec Filebeat', 'Parser les logs nginx', 'Créer une politique ILM de 30 jours', 'Créer un tableau de bord et une alerte'],
    d: 'tu retrouves en quelques secondes toutes les erreurs d\'un client sur une heure donnée.',
  },
  links: [
    ['Documentation Elastic', 'https://www.elastic.co/docs', 'doc'],
    ['Formations gratuites', 'https://www.elastic.co/training/free', 'cours'],
    ['Grok Debugger', 'https://www.elastic.co/docs/explore-analyze/query-filter/tools/grok-debugger', 'lab'],
    ['OpenSearch, alternative libre', 'https://opensearch.org/docs/latest/', 'doc'],
  ],
});

M({
  id: 'loki', name: 'Loki', stage: 'logs', mono: 'Lk', h: 8, sim: 'logs', simCfg: { lang: 'Façon LogQL', ex: 'level=error service=payment' }, pre: ['grafana'],
  pitch: 'Des logs à bas coût : seuls les labels sont indexés, façon Prometheus.',
  l: [[
    ['Indexer peu', `Loki n'indexe que des **labels** et compresse le reste dans un stockage objet. Cela coûte bien moins cher qu'un index complet. **Grafana Alloy** collecte et envoie les logs. La recherche se fait en **LogQL**.`, `# Toutes les erreurs du service payment
{namespace="boutique", app="payment"} |= "error"

# Extraire des champs JSON puis filtrer
{app="api"} | json | status >= 500 | line_format "{{.path}} {{.status}}"

# Taux d'erreurs par application
sum by (app)(rate({namespace="boutique"} |= "error" [5m]))`, 'logql', 'Garde peu de labels et à faible cardinalité : `namespace`, `app`, `env`. Jamais d\'identifiant de requête ou d\'utilisateur.'],
  ], [
    ['Collecter sur Kubernetes', `Le chart \`loki\` et \`alloy\` s'installent avec Helm. Alloy ajoute automatiquement des labels Kubernetes. Le stockage objet (S3, GCS, MinIO) permet de garder beaucoup d'historique à faible coût.`, `# config.alloy
discovery.kubernetes "pods" { role = "pod" }

loki.source.kubernetes "tous" {
  targets    = discovery.kubernetes.pods.targets
  forward_to = [loki.write.central.receiver]
}

loki.write "central" {
  endpoint { url = "http://loki-gateway/loki/api/v1/push" }
}`, 'text'],
  ], [
    ['Échelle et alertes', `En mode simple-scalable, Loki sépare lecture et écriture. Les **structured metadata** gardent des champs comme \`trace_id\` sans les indexer. Le **ruler** déclenche des alertes en LogQL, comme Prometheus.`, `groups:
  - name: paiement
    rules:
      - alert: EchecsPaiement
        expr: |
          sum(rate({app="payment"} |= "charge failed" [5m])) > 1
        for: 2m
        labels: { severity: page }
        annotations:
          summary: "Plus d'une erreur de paiement par seconde"`, 'yaml'],
  ]],
  lab: {
    ctx: 'Utilise `logcli` pour explorer les logs depuis ton terminal.',
    real: ['Tutoriel Loki', 'https://grafana.com/docs/loki/latest/get-started/quick-start/'],
    prompt: 'ops@bastion:~$',
    steps: [
      ['Liste les labels disponibles.', '^logcli labels', 'logcli labels', 'app\nnamespace\npod'],
      ['Liste les valeurs du label `app`.', '^logcli labels app', 'logcli labels app', 'api\ncart\npayment\nweb'],
      ['Cherche `error` dans `{app="payment"}`.', '^logcli query .*app="payment".*\\|= ?"error"', `logcli query '{app="payment"} |= "error"'`, '2026-11-02T10:04:12 charge failed: tls handshake timeout\n2026-11-02T10:04:15 charge failed: tls handshake timeout'],
      ['Compte les erreurs par minute avec `rate`, sur 1 minute.', '^logcli (query|instant-query) .*rate\\(.*app="payment".*\\[1m\\]', `logcli query 'rate({app="payment"} |= "error" [1m])'`, '{app="payment"} 2.41'],
    ],
  },
  quiz: [
    ['Qu\'est-ce que Loki indexe ?', ['Seulement les labels', 'Tout le texte', 'Rien du tout', 'Les images'], 0, 'C\'est la clé de son faible coût.'],
    ['Quel opérateur LogQL filtre le texte ?', ['`|=`', '`==>`', '`=~~`', '`//`'], 0, '`!=` exclut et `|~` utilise une regex.'],
    ['Quel label est à éviter ?', ['`request_id`', '`namespace`', '`app`', '`env`'], 0, 'Sa cardinalité est énorme.'],
  ],
  project: {
    t: 'Logs et métriques au même endroit',
    b: 'Ajoute Loki à ta pile Prometheus et Grafana.',
    s: ['Installer Loki et Alloy', 'Stocker les logs dans MinIO', 'Écrire des requêtes LogQL utiles', 'Créer une alerte à partir de logs', 'Relier les logs aux traces par `trace_id`'],
    d: 'depuis un pic d\'erreurs dans Grafana, tu arrives aux logs concernés en un clic.',
  },
  links: [
    ['Documentation Loki', 'https://grafana.com/docs/loki/latest/', 'doc'],
    ['LogQL', 'https://grafana.com/docs/loki/latest/query/', 'doc'],
    ['Grafana Alloy', 'https://grafana.com/docs/alloy/latest/', 'doc'],
  ],
});

M({
  id: 'graylog', name: 'Graylog', stage: 'logs', icon: 'graylog', h: 6, sim: 'logs', simCfg: { lang: 'Façon Graylog', ex: 'level:error service:payment' }, pre: ['docker'],
  pitch: 'Une plateforme de logs centrée sur l\'exploitation et la sécurité, avec routage par flux.',
  l: [[
    ['Inputs et streams', `Un **input** reçoit les logs, souvent en **GELF** ou Syslog. Les **streams** classent les messages par règles en temps réel. La recherche se fait dans l'interface web.`, `# Envoyer les logs d'un conteneur en GELF
docker run -d --log-driver=gelf \\
  --log-opt gelf-address=udp://graylog:12201 \\
  --log-opt tag=api \\
  acme/api:1.4

# Recherche
# source:web-01 AND level:3 AND message:"timeout"`, 'bash'],
  ], [
    ['Extraire et enrichir', `Les **pipelines** transforment les messages avec des règles lisibles. Les **lookup tables** enrichissent, par exemple pour traduire une IP en pays. Les **index sets** fixent la rétention par type de flux.`, `rule "extraire utilisateur"
when
  has_field("message") && contains(to_string($message.message), "login")
then
  let m = regex("user=(\\\\w+)", to_string($message.message));
  set_field("utilisateur", m["0"]);
  route_to_stream(name: "Authentification");
end`, 'text'],
  ], [
    ['Alertes et conformité', `Les **Event Definitions** détectent des motifs, comme 5 échecs de connexion en une minute. Les droits par flux contrôlent qui lit quoi. Graylog repose sur **OpenSearch** ou **Data Node**, et **MongoDB** pour sa configuration.`, `# docker-compose (extrait)
services:
  mongodb:
    image: mongo:7
  datanode:
    image: graylog/graylog-datanode:6.1
    environment:
      GRAYLOG_DATANODE_PASSWORD_SECRET: "\${SECRET}"
  graylog:
    image: graylog/graylog:6.1
    ports: ["9000:9000", "12201:12201/udp"]
    environment:
      GRAYLOG_PASSWORD_SECRET: "\${SECRET}"
      GRAYLOG_ROOT_PASSWORD_SHA2: "\${ADMIN_SHA2}"`, 'yaml'],
  ]],
  lab: {
    ctx: 'Lance Graylog et envoie-lui des logs de test.',
    real: ['Documentation Graylog', 'https://go2docs.graylog.org/current/home.htm'],
    prompt: 'ops@laptop:~/graylog$',
    steps: [
      ['Démarre la pile avec Docker Compose.', '^docker compose up -d', 'docker compose up -d', ' ✔ Container graylog-mongodb-1   Started\n ✔ Container graylog-graylog-1   Started'],
      ['Regarde les logs du service `graylog`.', '^docker compose logs (-f )?graylog', 'docker compose logs graylog', 'Graylog server up and running.'],
      ['Envoie un message GELF de test en UDP sur le port 12201.', 'nc .*-u.*12201', `echo '{"version":"1.1","host":"test","short_message":"bonjour"}' | nc -w1 -u localhost 12201`, ''],
    ],
  },
  quiz: [
    ['Qu\'est-ce que GELF ?', ['Un format de log structuré', 'Un langage de requête', 'Un plugin', 'Un cloud'], 0, 'Graylog Extended Log Format.'],
    ['À quoi sert un stream ?', ['Classer les messages en temps réel', 'Lire de la vidéo', 'Stocker des images', 'Compiler'], 0, 'Il permet aussi de contrôler les accès.'],
    ['Où est stockée la configuration ?', ['MongoDB', 'Redis', 'Git', 'S3'], 0, 'Les messages sont dans OpenSearch ou Data Node.'],
  ],
  project: {
    t: 'Détection de connexions suspectes',
    b: 'Utilise Graylog pour la sécurité d\'un serveur.',
    s: ['Déployer Graylog', 'Envoyer les logs d\'authentification en Syslog', 'Parser les tentatives de connexion', 'Enrichir les IP par pays', 'Alerter après 5 échecs en une minute'],
    d: 'une attaque simulée avec `hydra` sur ta propre VM de test déclenche l\'alerte.',
  },
  links: [
    ['Documentation Graylog', 'https://go2docs.graylog.org/current/home.htm', 'doc'],
    ['Graylog Academy', 'https://academy.graylog.org/', 'cours'],
    ['Docker Compose officiel', 'https://github.com/Graylog2/docker-compose', 'repo'],
  ],
});

M({
  id: 'splunk', name: 'Splunk', stage: 'logs', icon: 'splunk', h: 7, sim: 'logs', simCfg: { lang: 'Façon SPL', ex: 'level=error service=payment' }, pre: ['linux'],
  pitch: 'La plateforme d\'analyse de données machine des grandes entreprises, avec le langage SPL.',
  l: [[
    ['Chercher avec SPL', `Le **Forwarder** envoie les données, l'**Indexer** les stocke et le **Search Head** les interroge. **SPL** enchaîne des commandes avec le pipe, comme en shell.`, `index=web status>=500 earliest=-1h
| stats count by uri_path
| sort -count
| head 10

index=app level=ERROR
| timechart span=5m count by service`, 'spl'],
  ], [
    ['Extraire et rapporter', `\`rex\` extrait un champ à la volée. \`eval\` calcule, \`lookup\` enrichit. Les recherches se sauvegardent en **rapports**, **alertes** et **tableaux de bord**.`, `index=app "charge failed"
| rex field=_raw "code=(?<code>\\d+)"
| lookup codes_erreur.csv code OUTPUT libelle
| stats count by libelle
| where count > 10`, 'spl'],
  ], [
    ['Performance et sécurité', `Filtre tôt sur l'index et le temps. Les **tstats** interrogent les index accélérés bien plus vite. **Splunk Enterprise Security** ajoute une couche SIEM. La facture dépend souvent du volume ingéré : filtre les données inutiles dès l'envoi.`, `| tstats count where index=web by _time span=1h, host

# props.conf + transforms.conf : jeter le debug à l'indexation
[source::/var/log/app.log]
TRANSFORMS-null = sansdebug

[sansdebug]
REGEX = level=DEBUG
DEST_KEY = queue
FORMAT = nullQueue`, 'text'],
  ]],
  lab: {
    ctx: 'Lance Splunk Free et envoie-lui un fichier de logs.',
    real: ['Tutoriel de recherche Splunk', 'https://docs.splunk.com/Documentation/Splunk/latest/SearchTutorial/WelcometotheSearchTutorial'],
    prompt: 'ops@laptop:~$',
    steps: [
      ['Lance `splunk/splunk` nommé `splunk`, port 8000, en acceptant la licence.', '^docker run .*SPLUNK_GENERAL_TERMS.*splunk/splunk|^docker run .*SPLUNK_START_ARGS.*splunk/splunk', 'docker run -d --name splunk -p 8000:8000 -e SPLUNK_GENERAL_TERMS=--accept-sgt-current-at-splunk-com -e SPLUNK_START_ARGS=--accept-license -e SPLUNK_PASSWORD=$PWD_SPLUNK splunk/splunk', 'f0e1d2c3b4a5'],
      ['Ajoute le suivi de `/var/log/app.log` dans l\'index `app`.', '^docker exec .*splunk add monitor /var/log/app\\.log .*-index app', 'docker exec splunk /opt/splunk/bin/splunk add monitor /var/log/app.log -index app', 'Added monitor of \'/var/log/app.log\'.'],
      ['Lance une recherche : les erreurs par service.', '^docker exec .*splunk search .*stats count by service', `docker exec splunk /opt/splunk/bin/splunk search 'index=app level=ERROR | stats count by service'`, 'service   count\npayment   482\napi       31'],
    ],
  },
  quiz: [
    ['Quel composant collecte sur les serveurs ?', ['Le Forwarder', 'Le Search Head', 'Le License Master', 'Le Cluster Master'], 0, 'Le Universal Forwarder est très léger.'],
    ['Quelle commande extrait un champ par regex ?', ['`rex`', '`stats`', '`sort`', '`head`'], 0, 'Les captures nommées deviennent des champs.'],
    ['Comment accélérer une recherche ?', ['Filtrer tôt sur index et période', 'Tout chercher sur `*`', 'Supprimer les index', 'Augmenter le texte'], 0, 'Moins de données à lire, résultat plus rapide.'],
  ],
  project: {
    t: 'Tableau de bord d\'incidents',
    b: 'Avec la version gratuite, analyse des logs d\'application.',
    s: ['Ingérer des logs web et applicatifs', 'Écrire 5 recherches SPL utiles', 'Enrichir avec un lookup CSV', 'Créer un tableau de bord', 'Créer une alerte planifiée'],
    d: 'le tableau montre le taux d\'erreur par service et une alerte part au-delà du seuil.',
  },
  links: [
    ['Documentation Splunk', 'https://docs.splunk.com/Documentation', 'doc'],
    ['Search Reference', 'https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual', 'doc'],
    ['Formation gratuite', 'https://www.splunk.com/en_us/training/free-courses/overview.html', 'cours'],
  ],
});
