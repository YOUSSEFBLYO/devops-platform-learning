M({
  id: 'istio', name: 'Istio', stage: 'mesh', icon: 'istio', h: 14, sim: 'mesh', pre: ['k8s'],
  pitch: 'Le service mesh le plus complet : trafic, sécurité et observabilité sans toucher au code.',
  l: [[
    ['Le plan de données', `Un mesh place un proxy **Envoy** à côté de chaque service, ou un **ztunnel** par nœud en mode **ambient**. Tout le trafic y passe. **istiod** configure ces proxys. Le mode ambient évite les sidecars et réduit la charge.`, `istioctl install --set profile=ambient -y
kubectl label namespace boutique istio.io/dataplane-mode=ambient

istioctl proxy-status
istioctl analyze -n boutique
kubectl get pods -n istio-system`, 'bash'],
  ], [
    ['Trafic et canari', `Un **VirtualService** décrit le routage et une **DestinationRule** décrit les versions et les politiques de connexion. Tu fais ainsi un canari sans modifier les applications.`, `apiVersion: networking.istio.io/v1
kind: VirtualService
metadata: { name: api }
spec:
  hosts: [api]
  http:
    - route:
        - destination: { host: api, subset: v1 }
          weight: 90
        - destination: { host: api, subset: v2 }
          weight: 10
      retries: { attempts: 3, perTryTimeout: 2s }
      timeout: 5s
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata: { name: api }
spec:
  host: api
  subsets:
    - { name: v1, labels: { version: v1 } }
    - { name: v2, labels: { version: v2 } }
  trafficPolicy:
    outlierDetection: { consecutive5xxErrors: 5, interval: 10s, baseEjectionTime: 30s }`, 'yaml'],
  ], [
    ['Zero trust', `Le **mTLS** chiffre et identifie chaque service. **PeerAuthentication** l'impose, et **AuthorizationPolicy** définit qui peut appeler quoi, à partir des identités SPIFFE.`, `apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata: { name: strict, namespace: boutique }
spec:
  mtls: { mode: STRICT }
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata: { name: api, namespace: boutique }
spec:
  selector: { matchLabels: { app: api } }
  action: ALLOW
  rules:
    - from:
        - source: { principals: ["cluster.local/ns/boutique/sa/web"] }
      to:
        - operation: { methods: ["GET", "POST"], paths: ["/api/*"] }`, 'yaml', 'Passe d\'abord en mode `PERMISSIVE`, vérifie avec Kiali, puis seulement en `STRICT`. Sinon, les clients hors mesh seront coupés d\'un coup.'],
  ]],
  lab: {
    ctx: 'Active Istio sur un namespace et déploie un canari.',
    real: ['Tâches Istio', 'https://istio.io/latest/docs/tasks/'],
    prompt: 'ops@bastion:~$',
    steps: [
      ['Vérifie que le cluster peut accueillir Istio.', '^istioctl (x )?precheck', 'istioctl x precheck', '✔ No issues found when checking the cluster.'],
      ['Installe le profil `ambient`.', '^istioctl install .*profile[= ]ambient', 'istioctl install --set profile=ambient -y', '✔ Istio core installed\n✔ Istiod installed\n✔ Ztunnel installed'],
      ['Ajoute le namespace `boutique` au mesh ambient.', '^kubectl label (namespace|ns) boutique istio\\.io/dataplane-mode=ambient', 'kubectl label namespace boutique istio.io/dataplane-mode=ambient', 'namespace/boutique labeled'],
      ['Analyse la configuration.', '^istioctl analyze', 'istioctl analyze -n boutique', '✔ No validation issues found when analyzing namespace: boutique.'],
      ['Applique le canari `canary.yaml`.', '^kubectl apply -f canary\\.yaml', 'kubectl apply -f canary.yaml', 'virtualservice.networking.istio.io/api created\ndestinationrule.networking.istio.io/api created'],
    ],
  },
  quiz: [
    ['Quelle ressource répartit le trafic en pourcentage ?', ['VirtualService', 'Service', 'ConfigMap', 'Ingress classique'], 0, 'Elle attribue un poids à chaque version.'],
    ['Quel est l\'apport du mode ambient ?', ['Pas de sidecar par pod', 'Pas de chiffrement', 'Plus de Kubernetes', 'Un seul service'], 0, 'Un ztunnel par nœud gère la couche 4.'],
    ['Comment imposer le mTLS ?', ['PeerAuthentication en STRICT', 'Avec un Secret', 'Avec HPA', 'Avec un label `tls`'], 0, 'Tout trafic en clair est alors refusé.'],
    ['À quoi sert `outlierDetection` ?', ['Éjecter les instances défaillantes', 'Compter les pods', 'Lire les logs', 'Chiffrer etcd'], 0, 'C\'est le principe du disjoncteur.'],
  ],
  project: {
    t: 'Mesh sécurisé pour la boutique',
    b: 'Ajoute Istio à l\'application Online Boutique.',
    s: ['Installer Istio avec Kiali, Prometheus et Jaeger', 'Déployer un canari à 10 %, puis 50 %, puis 100 %', 'Injecter une panne avec une `fault` et observer les retries', 'Configurer un disjoncteur', 'Passer en mTLS strict', 'Autoriser uniquement les appels attendus'],
    d: 'Kiali montre le graphe chiffré, et un pod non autorisé reçoit un 403.',
  },
  links: [
    ['Documentation Istio', 'https://istio.io/latest/docs/', 'doc'],
    ['Mode ambient', 'https://istio.io/latest/docs/ambient/overview/', 'doc'],
    ['Kiali', 'https://kiali.io/docs/', 'doc'],
    ['Killercoda Istio', 'https://killercoda.com/istio', 'lab'],
  ],
});

M({
  id: 'linkerd', name: 'Linkerd', stage: 'mesh', icon: 'linkerd', h: 8, sim: 'mesh', pre: ['k8s'],
  pitch: 'Le service mesh léger et simple, avec un micro-proxy écrit en Rust.',
  l: [[
    ['Installer et injecter', `Linkerd vise la simplicité. Son proxy en Rust est minuscule et le mTLS est activé par défaut. Une annotation sur le namespace suffit pour injecter les proxys.`, `curl --proto '=https' --tlsv1.2 -sSfL https://run.linkerd.io/install-edge | sh
linkerd check --pre
linkerd install --crds | kubectl apply -f -
linkerd install | kubectl apply -f -
linkerd check

kubectl annotate ns boutique linkerd.io/inject=enabled
kubectl rollout restart deploy -n boutique`, 'bash'],
  ], [
    ['Observabilité et trafic', `Le **viz** fournit des métriques dorées sans configuration : succès, débit et latence. \`linkerd viz tap\` affiche les requêtes en direct. L'implémentation de la **Gateway API** gère la répartition du trafic.`, `linkerd viz install | kubectl apply -f -
linkerd viz stat deploy -n boutique
linkerd viz top deploy/api -n boutique
linkerd viz tap deploy/api -n boutique

# Canari avec HTTPRoute
# backendRefs:
#   - { name: api-v1, port: 80, weight: 90 }
#   - { name: api-v2, port: 80, weight: 10 }`, 'bash'],
  ], [
    ['Politiques et multicluster', `Les **AuthorizationPolicy** autorisent selon l'identité du ServiceAccount. Les **retries** et **timeouts** se déclarent sur les routes. Le **multicluster** relie les clusters, et **Flagger** automatise les canaris. Les certificats racine doivent être renouvelés : **cert-manager** s'en charge.`, `apiVersion: policy.linkerd.io/v1beta3
kind: Server
metadata: { name: api, namespace: boutique }
spec:
  podSelector: { matchLabels: { app: api } }
  port: 8080
---
apiVersion: policy.linkerd.io/v1alpha1
kind: AuthorizationPolicy
metadata: { name: api-web, namespace: boutique }
spec:
  targetRef: { group: policy.linkerd.io, kind: Server, name: api }
  requiredAuthenticationRefs:
    - { kind: ServiceAccount, name: web, namespace: boutique }`, 'yaml', 'Le certificat d\'ancrage généré par défaut expire au bout d\'un an. Sans rotation, tout le mesh tombe ce jour-là.'],
  ]],
  lab: {
    ctx: 'Installe Linkerd puis observe le trafic en direct.',
    real: ['Getting Started Linkerd', 'https://linkerd.io/2/getting-started/'],
    prompt: 'ops@bastion:~$',
    steps: [
      ['Vérifie les prérequis.', '^linkerd check --pre', 'linkerd check --pre', 'Status check results are √'],
      ['Installe les CRD.', '^linkerd install --crds \\| kubectl apply -f -', 'linkerd install --crds | kubectl apply -f -', 'customresourcedefinition.apiextensions.k8s.io/httproutes.policy.linkerd.io created'],
      ['Installe le plan de contrôle.', '^linkerd install \\| kubectl apply -f -', 'linkerd install | kubectl apply -f -', 'deployment.apps/linkerd-destination created'],
      ['Active l\'injection sur `boutique`.', '^kubectl annotate (namespace|ns) boutique linkerd\\.io/inject=enabled', 'kubectl annotate ns boutique linkerd.io/inject=enabled', 'namespace/boutique annotated'],
      ['Consulte les statistiques des déploiements de `boutique`.', '^linkerd viz stat (deploy|deployment) -n boutique', 'linkerd viz stat deploy -n boutique', 'NAME  MESHED  SUCCESS   RPS  LATENCY_P99\napi   3/3     99.85%    142  48ms'],
    ],
  },
  quiz: [
    ['En quel langage est écrit le proxy de Linkerd ?', ['Rust', 'Java', 'Bash', 'PHP'], 0, 'Il est conçu pour être petit et sûr.'],
    ['Le mTLS dans Linkerd est-il...', ['Activé par défaut', 'Payant', 'Impossible', 'Réservé à AWS'], 0, 'Tout le trafic TCP maillé est chiffré.'],
    ['Quelle commande montre les requêtes en direct ?', ['`linkerd viz tap`', '`git log`', '`docker ps`', '`curl -I`'], 0, 'Elle affiche chaque requête, sans changer le code.'],
  ],
  project: {
    t: 'Mesh minimal et fiable',
    b: 'Ajoute Linkerd à une application en microservices.',
    s: ['Installer Linkerd et viz', 'Mailler l\'application', 'Mesurer le surcoût mémoire et latence', 'Configurer retries et timeouts', 'Automatiser les certificats avec cert-manager'],
    d: 'tu présentes les métriques dorées de chaque service sans avoir modifié leur code.',
  },
  links: [
    ['Documentation Linkerd', 'https://linkerd.io/2/overview/', 'doc'],
    ['Getting Started', 'https://linkerd.io/2/getting-started/', 'cours'],
    ['Buoyant, blog et formations', 'https://www.buoyant.io/blog', 'blog'],
  ],
});

M({
  id: 'consul', name: 'Consul', stage: 'mesh', icon: 'consul', h: 8, sim: 'mesh', pre: ['docker'],
  pitch: 'Découverte de services et mesh qui fonctionnent aussi hors de Kubernetes.',
  l: [[
    ['Catalogue de services', `Consul maintient un **catalogue** des services et de leur santé. Une application s'y enregistre, puis trouve les autres par DNS ou API. Les serveurs s'accordent avec **Raft**.`, `consul agent -dev &

cat > web.json <<'EOF'
{ "service": { "name": "web", "port": 80,
  "check": { "http": "http://localhost/healthz", "interval": "10s" } } }
EOF
consul services register web.json

consul catalog services
dig @127.0.0.1 -p 8600 web.service.consul`, 'bash'],
  ], [
    ['Connect et intentions', `**Consul service mesh** ajoute des proxys Envoy et du mTLS. Les **intentions** définissent quels services peuvent se parler. Le **KV store** garde de la configuration partagée.`, `# Un service et son sidecar
service {
  name = "api"
  port = 8080
  connect { sidecar_service {} }
}

# Intention : web peut appeler api, tout le reste est refusé
Kind = "service-intentions"
Name = "api"
Sources = [
  { Name = "web", Action = "allow" },
  { Name = "*", Action = "deny" },
]
# consul config write intentions.hcl`, 'hcl'],
  ], [
    ['Multi-datacenter et automatisation', `La **fédération** relie plusieurs datacenters, et les **mesh gateways** assurent le trafic entre eux. **consul-terraform-sync** met à jour un répartiteur ou un pare-feu quand un service change. Sécurise toujours un cluster réel avec les **ACL** et le chiffrement gossip.`, `consul keygen                     # clé de chiffrement gossip
consul acl bootstrap              # jeton initial

consul operator raft list-peers
consul snapshot save sauvegarde.snap
consul kv put config/api/timeout 5s
consul watch -type=service -service=api ./recharger.sh`, 'bash'],
  ]],
  lab: {
    ctx: 'Enregistre un service, trouve-le, puis limite ses accès.',
    real: ['Tutoriels Consul', 'https://developer.hashicorp.com/consul/tutorials'],
    prompt: 'ops@lab:~$',
    steps: [
      ['Liste les membres du cluster.', '^consul members', 'consul members', 'Node    Address         Status  Type\nlab     127.0.0.1:8301  alive   server'],
      ['Enregistre le service décrit dans `web.json`.', '^consul services register web\\.json', 'consul services register web.json', 'Registered service: web'],
      ['Trouve son adresse par DNS, sur le port 8600.', '^dig .*-p ?8600 .*web\\.service\\.consul', 'dig @127.0.0.1 -p 8600 web.service.consul', 'web.service.consul. 0 IN A 127.0.0.1'],
      ['Stocke `5s` dans la clé `config/api/timeout`.', '^consul kv put config/api/timeout 5s', 'consul kv put config/api/timeout 5s', 'Success! Data written to: config/api/timeout'],
      ['Applique les intentions de `intentions.hcl`.', '^consul config write intentions\\.hcl', 'consul config write intentions.hcl', 'Config entry written: service-intentions/api'],
    ],
  },
  quiz: [
    ['Comment trouver un service dans Consul ?', ['Par DNS ou par l\'API', 'Par e-mail', 'Par SSH', 'Par FTP'], 0, 'Seuls les services sains sont renvoyés.'],
    ['À quoi sert une intention ?', ['Autoriser ou refuser un flux entre services', 'Stocker une image', 'Lancer une VM', 'Tracer un commit'], 0, 'Elle repose sur l\'identité du service.'],
    ['Quel est l\'atout de Consul face aux autres meshes ?', ['Il couvre aussi les VM et le multi-datacenter', 'Il ne fonctionne qu\'avec Windows', 'Il est sans proxy', 'Il remplace Git'], 0, 'Il n\'est pas limité à Kubernetes.'],
  ],
  project: {
    t: 'VM et conteneurs dans le même mesh',
    b: 'Connecte une application répartie entre une VM et Kubernetes.',
    s: ['Déployer un cluster Consul de 3 serveurs', 'Enregistrer des services avec health checks', 'Activer ACL et chiffrement gossip', 'Connecter deux services avec Envoy et mTLS', 'Définir les intentions', 'Tester une panne de serveur Consul'],
    d: 'les services continuent à communiquer après la perte d\'un serveur, et un flux non autorisé est refusé.',
  },
  links: [
    ['Documentation Consul', 'https://developer.hashicorp.com/consul/docs', 'doc'],
    ['Tutoriels Consul', 'https://developer.hashicorp.com/consul/tutorials', 'cours'],
    ['Consul sur Kubernetes', 'https://developer.hashicorp.com/consul/docs/k8s', 'doc'],
  ],
});

M({
  id: 'envoy', name: 'Envoy', stage: 'mesh', icon: 'envoyproxy', h: 9, sim: 'mesh', pre: ['nginx'],
  pitch: 'Le proxy moderne qui propulse Istio et de nombreuses passerelles API.',
  l: [[
    ['Listeners, routes, clusters', `Envoy reçoit sur un **listener**, applique une chaîne de **filtres**, choisit une **route**, puis envoie vers un **cluster** de backends. Sa configuration est verbeuse parce qu'elle est pensée pour être générée.`, `static_resources:
  listeners:
    - address: { socket_address: { address: 0.0.0.0, port_value: 8080 } }
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: ingress
                route_config:
                  virtual_hosts:
                    - name: api
                      domains: ["*"]
                      routes: [{ match: { prefix: "/" }, route: { cluster: api } }]
                http_filters:
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
  clusters:
    - name: api
      type: STRICT_DNS
      load_assignment:
        cluster_name: api
        endpoints:
          - lb_endpoints:
              - endpoint: { address: { socket_address: { address: api, port_value: 3000 } } }`, 'yaml'],
  ], [
    ['Résilience intégrée', `Envoy gère les **retries**, les **timeouts**, les **circuit breakers**, l'**outlier detection** et les **health checks**. Tout est mesuré, et l'interface d'administration sur le port 9901 expose l'état complet.`, `clusters:
  - name: api
    connect_timeout: 1s
    circuit_breakers:
      thresholds: [{ max_connections: 1000, max_pending_requests: 100 }]
    outlier_detection:
      consecutive_5xx: 5
      base_ejection_time: 30s
    health_checks:
      - timeout: 1s
        interval: 5s
        unhealthy_threshold: 3
        healthy_threshold: 1
        http_health_check: { path: /healthz }

# curl localhost:9901/stats | grep upstream_rq
# curl localhost:9901/clusters`, 'yaml'],
  ], [
    ['xDS et extensions', `L'API **xDS** permet à un plan de contrôle de reconfigurer Envoy à chaud : c'est ce que fait Istio. **Envoy Gateway** l'expose avec la Gateway API. Pour un comportement sur mesure, les filtres **Wasm** s'ajoutent sans recompiler.`, `# Bootstrap dynamique : tout vient du plan de contrôle
dynamic_resources:
  ads_config:
    api_type: GRPC
    transport_api_version: V3
    grpc_services: [{ envoy_grpc: { cluster_name: xds } }]
  cds_config: { ads: {}, resource_api_version: V3 }
  lds_config: { ads: {}, resource_api_version: V3 }
node: { id: api-1, cluster: boutique }`, 'yaml'],
  ]],
  lab: {
    ctx: 'Lance Envoy devant une API et inspecte son état.',
    real: ['Sandboxes Envoy', 'https://www.envoyproxy.io/docs/envoy/latest/start/sandboxes/'],
    prompt: 'ops@laptop:~/envoy$',
    steps: [
      ['Valide `envoy.yaml` avec le mode de validation.', '^(docker run .*envoyproxy/envoy.* )?(envoy )?--mode validate .*-c envoy\\.yaml|^envoy --mode validate -c envoy\\.yaml', 'envoy --mode validate -c envoy.yaml', 'configuration \'envoy.yaml\' OK'],
      ['Lance Envoy avec cette configuration.', '^envoy -c envoy\\.yaml', 'envoy -c envoy.yaml', '[info] all dependencies initialized. starting workers'],
      ['Regarde l\'état des clusters sur l\'admin 9901.', '^curl .*:9901/clusters', 'curl localhost:9901/clusters', 'api::10.0.0.11:3000::health_flags::healthy\napi::10.0.0.12:3000::health_flags::healthy'],
      ['Filtre les statistiques `upstream_rq` avec `grep`.', '^curl .*:9901/stats.*\\| ?grep upstream_rq', 'curl -s localhost:9901/stats | grep upstream_rq', 'cluster.api.upstream_rq_200: 1842\ncluster.api.upstream_rq_503: 3'],
    ],
  },
  quiz: [
    ['Quel est l\'ordre du traitement ?', ['Listener, filtres, route, cluster', 'Cluster, DNS, Git, pod', 'Route, Docker, SSH', 'Filtre, Helm, Kubernetes'], 0, 'C\'est le chemin de chaque requête.'],
    ['À quoi sert xDS ?', ['Reconfigurer Envoy dynamiquement', 'Compiler Rust', 'Gérer des disques', 'Signer des images'], 0, 'Les plans de contrôle s\'en servent.'],
    ['Sur quel port se trouve l\'admin par convention ?', ['9901', '22', '443', '53'], 0, 'À ne jamais exposer publiquement.'],
  ],
  project: {
    t: 'Passerelle résiliente',
    b: 'Construis une passerelle avec Envoy devant deux versions d\'une API.',
    s: ['Écrire une configuration statique', 'Répartir le trafic 90/10 entre deux clusters', 'Ajouter retries, timeouts et disjoncteur', 'Exposer les métriques à Prometheus', 'Provoquer une panne et lire les statistiques'],
    d: 'le client ne voit aucune erreur lorsqu\'une instance tombe, et `/stats` montre les retries.',
  },
  links: [
    ['Documentation Envoy', 'https://www.envoyproxy.io/docs/envoy/latest/', 'doc'],
    ['Sandboxes Envoy', 'https://www.envoyproxy.io/docs/envoy/latest/start/sandboxes/', 'lab'],
    ['Envoy Gateway', 'https://gateway.envoyproxy.io/', 'doc'],
  ],
});
