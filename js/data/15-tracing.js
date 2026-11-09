M({
  id: 'otel', name: 'OpenTelemetry', stage: 'tracing', icon: 'opentelemetry', h: 10, sim: 'trace', pre: ['docker'],
  pitch: 'Le standard ouvert pour produire traces, métriques et logs sans dépendre d\'un fournisseur.',
  l: [[
    ['Traces et spans', `Une **trace** suit une requête à travers les services. Elle se compose de **spans**, des opérations chronométrées. Le **contexte** voyage dans l'en-tête \`traceparent\`. OTel fournit des SDK pour produire ces données et un protocole commun, **OTLP**.`, `# Instrumentation automatique en Python
pip install opentelemetry-distro opentelemetry-exporter-otlp
opentelemetry-bootstrap -a install

OTEL_SERVICE_NAME=api \\
OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4317 \\
opentelemetry-instrument python app.py`, 'bash'],
  ], [
    ['Spans manuels et Collector', `Ajoute des spans autour du code métier, avec des attributs utiles. Le **Collector** reçoit, transforme et distribue vers n'importe quel backend : ton application ne connaît qu'OTLP.`, `from opentelemetry import trace
tracer = trace.get_tracer("boutique")

def payer(commande):
    with tracer.start_as_current_span("paiement") as span:
        span.set_attribute("commande.id", commande.id)
        span.set_attribute("commande.montant", commande.total)
        try:
            return psp.charge(commande)
        except Exception as e:
            span.record_exception(e)
            span.set_status(trace.StatusCode.ERROR)
            raise`, 'python'],
  ], [
    ['Échantillonnage et Collector en production', `Tout tracer coûte cher. Le **head sampling** décide au début, le **tail sampling** décide à la fin : on garde toutes les erreurs et requêtes lentes, plus 5 % du reste. Sur Kubernetes, l'**Operator** injecte l'instrumentation sans modifier les images.`, `# collector.yaml
receivers:
  otlp: { protocols: { grpc: {}, http: {} } }
processors:
  memory_limiter: { check_interval: 1s, limit_percentage: 80 }
  tail_sampling:
    decision_wait: 10s
    policies:
      - { name: erreurs, type: status_code, status_code: { status_codes: [ERROR] } }
      - { name: lentes, type: latency, latency: { threshold_ms: 500 } }
      - { name: reste, type: probabilistic, probabilistic: { sampling_percentage: 5 } }
  batch: {}
exporters:
  otlp/jaeger: { endpoint: jaeger:4317, tls: { insecure: true } }
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, tail_sampling, batch]
      exporters: [otlp/jaeger]`, 'yaml', 'Le tail sampling exige que tous les spans d\'une trace arrivent au même Collector. Utilise le `loadbalancing exporter` devant.'],
  ]],
  lab: {
    ctx: 'Instrumente une API Python et envoie ses traces à un Collector.',
    real: ['Démo officielle OpenTelemetry', 'https://opentelemetry.io/docs/demo/'],
    prompt: 'dev@laptop:~/api$',
    steps: [
      ['Installe la distribution et l\'exportateur OTLP.', '^pip3? install .*opentelemetry-distro.*opentelemetry-exporter-otlp|^pip3? install .*opentelemetry-exporter-otlp.*opentelemetry-distro', 'pip install opentelemetry-distro opentelemetry-exporter-otlp', 'Successfully installed opentelemetry-distro-0.50b0'],
      ['Détecte et installe les instrumentations.', '^opentelemetry-bootstrap -a install', 'opentelemetry-bootstrap -a install', 'Installed opentelemetry-instrumentation-flask'],
      ['Valide la configuration `collector.yaml`.', '^otelcol(-contrib)? validate --config[ =]collector\\.yaml', 'otelcol validate --config=collector.yaml', ''],
      ['Lance `app.py` instrumenté, avec `OTEL_SERVICE_NAME=api`.', 'OTEL_SERVICE_NAME=api .*opentelemetry-instrument python3? app\\.py', 'OTEL_SERVICE_NAME=api opentelemetry-instrument python app.py', '* Running on http://127.0.0.1:5000\ntrace_id=4bf92f3577b34da6 span_id=00f067aa0ba902b7'],
    ],
  },
  quiz: [
    ['Qu\'est-ce qu\'un span ?', ['Une opération chronométrée dans une trace', 'Un fichier de log', 'Un tableau de bord', 'Un conteneur'], 0, 'Les spans s\'imbriquent pour former la trace.'],
    ['Quel est le rôle du Collector ?', ['Recevoir, traiter et exporter', 'Afficher des courbes', 'Stocker pour toujours', 'Compiler le code'], 0, 'Il découple l\'application du backend.'],
    ['Quel avantage a le tail sampling ?', ['Garder les traces intéressantes', 'Tout supprimer', 'Réduire le code', 'Éviter HTTPS'], 0, 'La décision se fait une fois la trace complète.'],
    ['Pourquoi OpenTelemetry plutôt qu\'un SDK propriétaire ?', ['Pour changer de fournisseur sans réinstrumenter', 'Pour payer plus', 'Parce qu\'il est plus lent', 'Parce qu\'il remplace Git'], 0, 'L\'instrumentation devient portable.'],
  ],
  project: {
    t: 'Instrumenter des microservices',
    b: 'Explore la démo officielle, puis applique-la à tes services.',
    s: ['Lancer la démo OpenTelemetry', 'Instrumenter deux services avec propagation du contexte', 'Ajouter des spans métier avec attributs', 'Déployer un Collector avec tail sampling', 'Exporter vers Jaeger et Prometheus'],
    d: 'une requête traverse les deux services dans une seule trace, et les traces en erreur sont toutes conservées.',
  },
  links: [
    ['Documentation OpenTelemetry', 'https://opentelemetry.io/fr/docs/', 'doc'],
    ['Démo officielle', 'https://opentelemetry.io/docs/demo/', 'lab'],
    ['Conventions sémantiques', 'https://opentelemetry.io/docs/specs/semconv/', 'doc'],
    ['Registre OpenTelemetry', 'https://opentelemetry.io/ecosystem/registry/', 'doc'],
  ],
});

M({
  id: 'jaeger', name: 'Jaeger', stage: 'tracing', icon: 'jaeger', h: 6, sim: 'trace', pre: ['otel'],
  pitch: 'Le backend de traçage distribué de la CNCF pour stocker et explorer les traces.',
  l: [[
    ['Lancer et lire', `Jaeger reçoit les traces en OTLP. Son interface permet de chercher par service, durée ou tag, puis d'afficher la **cascade** des spans. L'application de démo **HotROD** est idéale pour apprendre.`, `docker run -d --name jaeger \\
  -p 16686:16686 -p 4317:4317 -p 4318:4318 \\
  jaegertracing/jaeger:2.5.0

docker run --rm --link jaeger \\
  -e OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318 \\
  -p 8080:8080 jaegertracing/example-hotrod:1.68 all`, 'bash'],
  ], [
    ['Diagnostiquer', `Lis une trace comme ceci : où est le temps ? Y a-t-il une longue attente sans span (temps non instrumenté) ? Des spans en série qui pourraient être parallèles ? Le **Service Performance Monitoring** ajoute taux et latence par service, et le **graphe de dépendances** montre qui appelle qui.`, `# Lire une trace par API
curl "http://localhost:16686/api/traces?service=api&tags=%7B%22error%22%3A%22true%22%7D&limit=20" \\
  | jq '.data[].traceID'

# Comparer deux traces dans l'interface : Compare`, 'bash'],
  ], [
    ['Stockage en production', `La version mémoire ne convient qu'au test. En production, utilise **Cassandra**, **Elasticsearch/OpenSearch** ou **ClickHouse**, avec une durée de rétention. Jaeger v2 repose sur le Collector OpenTelemetry. **Grafana Tempo** est une alternative stockée sur objet.`, `# config.yaml (Jaeger v2)
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [jaeger_storage_exporter]
extensions:
  jaeger_storage:
    backends:
      es_main:
        elasticsearch:
          server_urls: ["http://es:9200"]
          index_prefix: jaeger
  jaeger_query: { storage: { traces: es_main } }`, 'yaml'],
  ]],
  lab: {
    ctx: 'Démarre Jaeger et l\'application HotROD pour trouver une lenteur.',
    real: ['Tutoriel HotROD', 'https://github.com/jaegertracing/jaeger/tree/main/examples/hotrod'],
    prompt: 'ops@laptop:~$',
    steps: [
      ['Lance `jaegertracing/jaeger:2.5.0` nommé `jaeger`, port 16686.', '^docker run .*jaegertracing/jaeger', 'docker run -d --name jaeger -p 16686:16686 -p 4317:4317 -p 4318:4318 jaegertracing/jaeger:2.5.0', '7fa21b6c0d93'],
      ['Vérifie les services connus avec l\'API `/api/services`.', '^curl .*:16686/api/services', 'curl http://localhost:16686/api/services', '{ "data": ["customer","driver","frontend","mysql","redis","route"] }'],
      ['Récupère 1 trace du service `frontend`.', '^curl .*api/traces\\?service=frontend', 'curl "http://localhost:16686/api/traces?service=frontend&limit=1"', '{ "data": [{ "traceID": "4bf92f3577b34da6", "spans": [...48 spans] }] }'],
    ],
  },
  quiz: [
    ['Quel protocole utiliser pour envoyer à Jaeger ?', ['OTLP', 'SMTP', 'FTP', 'SNMP'], 0, 'Les anciens SDK Jaeger sont remplacés par OpenTelemetry.'],
    ['Que montre le graphe de dépendances ?', ['Qui appelle qui', 'Les factures', 'Les branches Git', 'Les utilisateurs'], 0, 'Il se construit à partir des traces.'],
    ['Quel stockage éviter en production ?', ['La mémoire', 'Cassandra', 'Elasticsearch', 'OpenSearch'], 0, 'Tout est perdu au redémarrage.'],
  ],
  project: {
    t: 'Enquête HotROD',
    b: 'Utilise l\'application de démonstration comme une vraie enquête de performance.',
    s: ['Lancer Jaeger et HotROD', 'Trouver le motif N+1 dans le service `customer`', 'Repérer les attentes sur un verrou', 'Corriger avec les options de HotROD', 'Mesurer le gain de latence'],
    d: 'tu expliques avec des captures de traces où partait le temps avant et après.',
  },
  links: [
    ['Documentation Jaeger', 'https://www.jaegertracing.io/docs/latest/', 'doc'],
    ['Exemple HotROD', 'https://github.com/jaegertracing/jaeger/tree/main/examples/hotrod', 'repo'],
    ['Article de Yuri Shkuro', 'https://medium.com/opentracing/take-opentracing-for-a-hotrod-ride-f6e3141f7941', 'blog'],
    ['Grafana Tempo', 'https://grafana.com/docs/tempo/latest/', 'doc'],
  ],
});
