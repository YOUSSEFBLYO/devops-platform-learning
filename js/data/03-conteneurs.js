M({
  id: 'docker', name: 'Docker', stage: 'conteneurs', icon: 'docker', h: 18, sim: 'layers', pre: ['linux'],
  pitch: 'Empaqueter une application et tout ce dont elle a besoin dans une image qui tourne partout.',
  l: [[
    ['Image et conteneur', `Une **image** est un modèle immuable, un **conteneur** est une instance de cette image en cours d'exécution. Comme une classe et un objet.

Fini le « ça marche sur ma machine » : l'application voyage avec ses dépendances.`, `docker run -d --name web -p 8080:80 nginx:1.27
docker ps                 # conteneurs actifs
docker logs -f web        # journaux
docker exec -it web sh    # shell à l'intérieur
docker stop web && docker rm web
docker images`, 'bash', 'Ce qui est écrit dans un conteneur disparaît avec lui. Toute donnée à conserver va dans un volume.'],
    ['Écrire un Dockerfile', `Le Dockerfile décrit la construction de l'image, instruction par instruction. Chaque instruction crée une **couche** mise en cache. Copie donc d'abord ce qui change rarement.`, `FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
USER node
EXPOSE 3000
CMD ["node", "server.js"]

# docker build -t boutique:1.0 .`, 'dockerfile', 'N\'utilise pas `latest` en production : tu ne sais jamais quelle version tourne.'],
  ], [
    ['Compose, volumes et réseaux', `**Docker Compose** décrit plusieurs conteneurs dans un fichier. Les services se joignent par leur nom grâce au DNS interne. Les **volumes** conservent les données.`, `services:
  web:
    build: .
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgres://app:secret@db:5432/boutique
    depends_on:
      db: { condition: service_healthy }
  db:
    image: postgres:17
    environment: { POSTGRES_USER: app, POSTGRES_PASSWORD: secret, POSTGRES_DB: boutique }
    volumes: [dbdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "app"]
      interval: 5s
volumes:
  dbdata:`, 'yaml'],
    ['Multi-stage et images légères', `Un build **multi-stage** compile dans une première image, puis ne copie que le résultat dans une image finale minimale. Moins de poids, moins de failles, moins d'outils pour un attaquant.`, `FROM node:22 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev
USER node
CMD ["node", "dist/server.js"]`, 'dockerfile'],
  ], [
    ['Sécurité de la chaîne', `Une image de production doit : tourner en non-root, s'exécuter avec un système de fichiers en lecture seule, abandonner les capacités Linux inutiles, être scannée et épinglée par digest.

\`docker scout\` ou **Trivy** cherchent les failles connues, **Cosign** signe l'image et **Syft** génère une liste des composants (SBOM).`, `docker build --provenance=true --sbom=true -t acme/api:1.4 .
trivy image --severity CRITICAL,HIGH --exit-code 1 acme/api:1.4
cosign sign acme/api@sha256:abcd…

docker run --read-only --tmpfs /tmp \\
  --cap-drop=ALL --security-opt no-new-privileges \\
  --user 1000:1000 --memory=256m --cpus=0.5 acme/api:1.4`, 'bash', 'Monter `/var/run/docker.sock` dans un conteneur revient à lui donner le contrôle total de l\'hôte.'],
    ['BuildKit et builds multi-architectures', `**BuildKit**, le moteur de build actuel, gère le cache distant, les secrets de build et les images multi-plateformes. Avec \`buildx\`, une seule commande produit une image pour Intel et ARM, utile pour les instances Graviton.`, `# Secret de build : jamais écrit dans une couche
# RUN --mount=type=secret,id=npm cat /run/secrets/npm > .npmrc && npm ci

docker buildx create --use
docker buildx build \\
  --platform linux/amd64,linux/arm64 \\
  --secret id=npm,src=$HOME/.npmrc \\
  --cache-from type=registry,ref=acme/api:cache \\
  --cache-to type=registry,ref=acme/api:cache,mode=max \\
  -t acme/api:1.4 --push .`, 'bash'],
  ]],
  lab: {
    ctx: 'Containerise la boutique et publie son image.',
    real: ['Play with Docker, un Docker gratuit dans le navigateur', 'https://labs.play-with-docker.com/'],
    prompt: 'dev@laptop:~/boutique$',
    steps: [
      ['Construis l\'image `boutique:1.0`.', '^docker (image )?build .*-t boutique:1\\.0 ?\\.?|^docker buildx build .*-t boutique:1\\.0', 'docker build -t boutique:1.0 .', `[+] Building 34.2s (11/11) FINISHED
 => [3/5] COPY package*.json ./
 => [4/5] RUN npm ci --omit=dev
 => => naming to docker.io/library/boutique:1.0`],
      ['Lance-la en arrière-plan sous le nom `web`, port 8080 vers 3000.', '^docker run .*-d.*-p 8080:3000|^docker run .*-p 8080:3000.*-d|^docker run -d', 'docker run -d --name web -p 8080:3000 boutique:1.0', 'c8f1e2a91b77'],
      ['Vérifie qu\'il tourne.', '^docker (ps|container ls)', 'docker ps', `CONTAINER ID   IMAGE          STATUS         PORTS
c8f1e2a91b77   boutique:1.0   Up 4 seconds   0.0.0.0:8080->3000/tcp`],
      ['Affiche ses journaux.', '^docker logs (-f )?web', 'docker logs web', 'Server listening on port 3000'],
      ['Scanne l\'image avec Trivy, sévérité CRITICAL.', '^trivy image .*boutique:1\\.0', 'trivy image --severity CRITICAL boutique:1.0', `boutique:1.0 (debian 12.8)
Total: 0 (CRITICAL: 0)`],
      ['Tague l\'image `ghcr.io/acme/boutique:1.0`.', '^docker (image )?tag boutique:1\\.0 ghcr\\.io/acme/boutique:1\\.0', 'docker tag boutique:1.0 ghcr.io/acme/boutique:1.0', ''],
      ['Pousse-la.', '^docker (image )?push ghcr\\.io/acme/boutique:1\\.0', 'docker push ghcr.io/acme/boutique:1.0', '1.0: digest: sha256:9c1f… size: 1784'],
    ],
  },
  quiz: [
    ['Pourquoi copier `package.json` avant le code source ?', ['Pour garder l\'installation des dépendances en cache', 'Pour réduire les droits', 'Pour changer de port', 'C\'est obligatoire'], 0, 'Le cache saute dès qu\'un fichier copié change.'],
    ['Que permet un build multi-stage ?', ['Livrer une image finale sans les outils de compilation', 'Lancer plusieurs conteneurs', 'Chiffrer l\'image', 'Faire du DNS'], 0, 'L\'image finale ne contient que le résultat.'],
    ['Où conserver les données d\'une base ?', ['Dans un volume', 'Dans la couche du conteneur', 'Dans `/tmp`', 'Dans le Dockerfile'], 0, 'Le volume survit à la suppression du conteneur.'],
    ['Pourquoi éviter de tourner en root ?', ['Pour limiter les dégâts en cas de compromission', 'Pour consommer moins de RAM', 'Parce que Docker l\'interdit', 'Pour accélérer le réseau'], 0, 'Une évasion serait beaucoup plus grave en root.'],
    ['Comment passer un jeton au build sans l\'écrire dans l\'image ?', ['`--secret` de BuildKit', '`ENV TOKEN=...`', '`ARG TOKEN`', '`COPY .env`'], 0, '`ARG` et `ENV` restent visibles dans l\'historique de l\'image.'],
  ],
  project: {
    t: 'Application trois tiers conteneurisée',
    b: 'Conteneurise une application composée d\'un frontend, d\'une API et d\'une base PostgreSQL.',
    s: ['Écrire un Dockerfile multi-stage pour chaque service', 'Passer sous 150 Mo pour l\'image de l\'API', 'Décrire le tout dans `compose.yaml` avec healthchecks', 'Tourner en non-root avec un système de fichiers en lecture seule', 'Scanner avec Trivy sans faille critique', 'Publier les images sur un registre avec un tag par commit'],
    d: '`docker compose up` lance l\'application complète et les données survivent à `docker compose down`.',
    x: 'Construis pour amd64 et arm64 avec buildx et ajoute une signature Cosign.',
  },
  links: [
    ['Documentation Docker', 'https://docs.docker.com/', 'doc'],
    ['Play with Docker', 'https://labs.play-with-docker.com/', 'lab'],
    ['Bonnes pratiques Dockerfile', 'https://docs.docker.com/build/building/best-practices/', 'doc'],
    ['Trivy', 'https://trivy.dev/', 'doc'],
    ['Dive, explorer les couches', 'https://github.com/wagoodman/dive', 'repo'],
    ['Roadmap Docker', 'https://roadmap.sh/docker', 'cours'],
  ],
});

M({
  id: 'swarm', name: 'Docker Swarm', stage: 'conteneurs', icon: 'docker', mono: 'Sw', h: 6, sim: 'pods', simCfg: { pod: 'task', deploy: 'le service Swarm' }, pre: ['docker'],
  simIntro: 'Swarm applique la même logique que Kubernetes, avec d\'autres mots : un service, des tasks, des nœuds. Tue une task, coupe un nœud et observe la correction.',
  pitch: 'L\'orchestrateur intégré à Docker : simple à mettre en place pour des besoins modestes.',
  l: [[
    ['Un cluster en deux commandes', `Swarm transforme plusieurs hôtes Docker en cluster. Les **managers** décident et les **workers** exécutent. Un **service** décrit l'état voulu et Swarm le maintient en lançant des **tasks**.`, `docker swarm init --advertise-addr 10.0.0.1
# sur chaque worker, avec le jeton affiché :
docker swarm join --token SWMTKN-… 10.0.0.1:2377

docker service create --name web --replicas 3 -p 80:80 nginx:1.27
docker service ls
docker service ps web
docker service scale web=6`, 'bash'],
  ], [
    ['Stacks et mises à jour progressives', `Une **stack** déploie un fichier Compose sur le cluster. La section \`deploy\` règle les réplicas, le déploiement progressif et le retour arrière automatique.`, `services:
  api:
    image: acme/api:1.4
    deploy:
      replicas: 4
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
      resources:
        limits: { cpus: "0.5", memory: 256M }
    secrets: [db_password]
secrets:
  db_password:
    external: true

# docker stack deploy -c stack.yml boutique`, 'yaml'],
  ], [
    ['Quorum et limites', `Les managers utilisent le protocole **Raft** : il faut une majorité pour décider. Trois managers tolèrent une panne, cinq en tolèrent deux. Un nombre pair n'apporte rien.

Swarm reste pertinent pour de petites équipes. Dès qu'il faut un écosystème riche, de l'autoscaling, des opérateurs ou du multi-tenant, Kubernetes prend le relais.`, `docker node ls
docker node update --availability drain worker-2   # maintenance
docker node promote worker-3                       # nouveau manager
docker swarm update --autolock=true                # chiffre les clés Raft
docker service rollback api`, 'bash', 'Si tu perds la majorité des managers, le cluster ne peut plus changer. Il faut alors `docker swarm init --force-new-cluster`.'],
  ]],
  lab: {
    ctx: 'Monte un service répliqué et mets-le à jour sans coupure.',
    real: ['Play with Docker', 'https://labs.play-with-docker.com/'],
    prompt: 'root@manager-1:~#',
    steps: [
      ['Initialise le Swarm.', '^docker swarm init', 'docker swarm init', 'Swarm initialized: current node (k2l9) is now a manager.'],
      ['Crée le service `web`, 3 réplicas, port 80, image `nginx:1.27`.', '^docker service create .*--replicas[ =]3.*', 'docker service create --name web --replicas 3 -p 80:80 nginx:1.27', 'overall progress: 3 out of 3 tasks\nverify: Service converged'],
      ['Passe à 6 réplicas.', '^docker service (scale web=6|update --replicas[ =]6 web)', 'docker service scale web=6', 'web scaled to 6\nverify: Service converged'],
      ['Mets à jour l\'image vers `nginx:1.28`.', '^docker service update .*--image nginx:1\\.28 .*web', 'docker service update --image nginx:1.28 web', 'overall progress: 6 out of 6 tasks\nverify: Service converged'],
      ['Reviens à la version précédente.', '^docker service (rollback web|update --rollback web)', 'docker service rollback web', 'rollback: manually requested rollback\nverify: Service converged'],
    ],
  },
  quiz: [
    ['Combien de managers pour tolérer deux pannes ?', ['5', '2', '3', '4'], 0, 'Il faut une majorité : 3 sur 5.'],
    ['Comment déployer un fichier Compose sur un Swarm ?', ['`docker stack deploy`', '`docker run`', '`docker build`', '`docker swarm join`'], 0, 'Une stack regroupe plusieurs services.'],
    ['Comment vider un nœud avant maintenance ?', ['Le passer en `drain`', 'L\'éteindre sans prévenir', '`docker rm`', '`docker stop`'], 0, 'Les tasks migrent proprement vers les autres nœuds.'],
  ],
  project: {
    t: 'Cluster Swarm à trois nœuds',
    b: 'Déploie un cluster sur trois VM locales ou trois petites instances.',
    s: ['Initialiser un manager et deux workers', 'Déployer une stack avec reverse proxy et API', 'Utiliser un secret Swarm pour la base', 'Configurer une mise à jour progressive avec rollback auto', 'Mettre un nœud en maintenance sans interruption'],
    d: 'une boucle `curl` ne voit aucune erreur pendant la mise à jour et la maintenance.',
  },
  links: [
    ['Swarm mode', 'https://docs.docker.com/engine/swarm/', 'doc'],
    ['Tutoriel Swarm', 'https://docs.docker.com/engine/swarm/swarm-tutorial/', 'cours'],
    ['Play with Docker', 'https://labs.play-with-docker.com/', 'lab'],
  ],
});

M({
  id: 'k8s', name: 'Kubernetes', stage: 'conteneurs', icon: 'kubernetes', mono: 'K8', h: 40, sim: 'pods', pre: ['docker'],
  pitch: 'L\'orchestrateur standard : il place, relance, met à l\'échelle et met à jour tes conteneurs.',
  l: [[
    ['L\'état voulu', `Tu ne dis pas à Kubernetes **quoi faire**, tu lui dis **ce que tu veux**. Des contrôleurs comparent en permanence l'état voulu et l'état réel, puis corrigent l'écart.

Le **pod** est la plus petite unité : un ou plusieurs conteneurs qui partagent le réseau. Un **Deployment** maintient le bon nombre de pods.`, `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 3
  selector:
    matchLabels: { app: web }
  template:
    metadata:
      labels: { app: web }
    spec:
      containers:
        - name: web
          image: nginx:1.27
          ports: [{ containerPort: 80 }]`, 'yaml'],
    ['Les commandes du quotidien', `\`kubectl\` parle à l'API du cluster. Pour un cluster local, utilise **kind**, **k3d** ou **minikube**. Un **Service** donne une adresse stable devant des pods qui, eux, vont et viennent.`, `kind create cluster
kubectl apply -f web.yaml
kubectl get pods -o wide
kubectl describe pod web-7d9…
kubectl logs -f deploy/web
kubectl expose deployment web --port=80
kubectl port-forward svc/web 8080:80
kubectl exec -it deploy/web -- sh`, 'bash', 'Face à un `CrashLoopBackOff`, regarde `kubectl logs --previous` : les logs utiles sont dans le conteneur qui vient de mourir.'],
  ], [
    ['Configuration, sondes et ressources', `Un pod de production déclare : des **requests** pour le placement et des **limits** pour le plafond, une **readiness probe** pour recevoir du trafic seulement s'il est prêt, une **liveness probe** pour être redémarré s'il est bloqué. La configuration vient des **ConfigMaps** et **Secrets**.`, `containers:
  - name: api
    image: acme/api:1.4
    envFrom:
      - configMapRef: { name: api-config }
      - secretRef: { name: api-secrets }
    resources:
      requests: { cpu: 100m, memory: 128Mi }
      limits: { memory: 256Mi }
    readinessProbe:
      httpGet: { path: /ready, port: 8080 }
    livenessProbe:
      httpGet: { path: /healthz, port: 8080 }
      initialDelaySeconds: 10`, 'yaml', 'Une liveness probe qui teste la base de données fait redémarrer tous les pods dès que la base ralentit. Elle ne doit tester que le processus.'],
    ['Exposer et mettre à l\'échelle', `La **Gateway API** remplace progressivement Ingress pour exposer le trafic HTTP. Le **HPA** ajuste le nombre de pods selon la charge, et le **Cluster Autoscaler** ou Karpenter ajoute des nœuds.

Les rolling updates remplacent les pods progressivement, et \`kubectl rollout undo\` revient en arrière.`, `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: api }
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: api }
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource: { name: cpu, target: { type: Utilization, averageUtilization: 70 } }
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata: { name: api }
spec:
  parentRefs: [{ name: public }]
  hostnames: [api.acme.fr]
  rules:
    - backendRefs: [{ name: api, port: 80 }]`, 'yaml'],
  ], [
    ['Sécurité multi-équipes', `Dans un cluster partagé : **RBAC** avec le moindre privilège, **NetworkPolicy** pour cloisonner le réseau, **Pod Security Standards** pour interdire les pods dangereux, politiques avec **Kyverno** ou **Gatekeeper**, quotas par namespace.`, `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: api, namespace: boutique }
spec:
  podSelector: { matchLabels: { app: api } }
  policyTypes: [Ingress, Egress]
  ingress:
    - from: [{ podSelector: { matchLabels: { app: web } } }]
      ports: [{ port: 8080 }]
  egress:
    - to: [{ podSelector: { matchLabels: { app: postgres } } }]
      ports: [{ port: 5432 }]
# kubectl label ns boutique pod-security.kubernetes.io/enforce=restricted`, 'yaml'],
    ['Architecture et extensions', `Le **control plane** contient \`kube-apiserver\`, \`etcd\`, le \`scheduler\` et les contrôleurs. Sur chaque nœud, le \`kubelet\` lance les pods. Tout passe par l'API, et tout est un objet observable.

C'est pourquoi on peut étendre Kubernetes : une **CRD** ajoute un type d'objet et un **opérateur** le gère. Pour les bases de données en production, on préfère un opérateur (CloudNativePG, par exemple) à un simple StatefulSet.`, `apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata: { name: boutique-db }
spec:
  instances: 3
  storage: { size: 20Gi }
  backup:
    barmanObjectStore:
      destinationPath: s3://backups/boutique
      s3Credentials:
        accessKeyId: { name: s3, key: id }
        secretAccessKey: { name: s3, key: key }`, 'yaml', 'Une panne d\'`etcd` sans sauvegarde signifie perdre tout l\'état du cluster. Automatise `etcdctl snapshot save` si tu gères ton control plane.'],
  ]],
  lab: {
    ctx: 'Un déploiement vient de casser en production. Diagnostique, corrige, puis mets à l\'échelle.',
    real: ['Killercoda, un cluster Kubernetes gratuit', 'https://killercoda.com/playgrounds/scenario/kubernetes'],
    prompt: 'ops@bastion:~$',
    steps: [
      ['Liste les pods du namespace `boutique`.', '^kubectl get (pods?|po) .*(-n|--namespace)[ =]boutique|^kubectl (-n|--namespace)[ =]boutique get (pods?|po)', 'kubectl get pods -n boutique', `NAME                   READY   STATUS             RESTARTS   AGE
api-6c9f7d8b5-kx2lp    0/1     ImagePullBackOff   0          2m
api-6c9f7d8b5-v9d4t    0/1     ImagePullBackOff   0          2m
web-5d7c9f88c-q2w8r    1/1     Running            0          3d`],
      ['Décris le pod `api-6c9f7d8b5-kx2lp` pour lire ses événements.', '^kubectl (-n boutique )?describe (pod|pods|po)[ /]api-6c9f7d8b5-kx2lp', 'kubectl describe pod api-6c9f7d8b5-kx2lp -n boutique', `Events:
  Warning  Failed  1m  kubelet  Failed to pull image "acme/api:1.5": manifest unknown
  Warning  Failed  1m  kubelet  Error: ImagePullBackOff`],
      ['Annule le dernier déploiement de `api`.', '^kubectl (-n boutique )?rollout undo (deployment|deploy)[ /]api', 'kubectl rollout undo deployment/api -n boutique', 'deployment.apps/api rolled back'],
      ['Suis l\'avancement du rollout.', '^kubectl (-n boutique )?rollout status (deployment|deploy)[ /]api', 'kubectl rollout status deployment/api -n boutique', 'deployment "api" successfully rolled out'],
      ['Monte `api` à 5 réplicas.', '^kubectl (-n boutique )?scale (deployment|deploy)[ /]api .*--replicas[ =]5|^kubectl (-n boutique )?scale --replicas[ =]5 (deployment|deploy)[ /]api', 'kubectl scale deployment/api --replicas=5 -n boutique', 'deployment.apps/api scaled'],
      ['Regarde la consommation des pods.', '^kubectl top (pods?|po)', 'kubectl top pods -n boutique', `NAME                   CPU(cores)   MEMORY(bytes)
api-6c9f7d8b5-kx2lp    42m          118Mi
web-5d7c9f88c-q2w8r    6m           31Mi`],
    ],
  },
  quiz: [
    ['Quelle sonde retire un pod du trafic sans le redémarrer ?', ['Readiness', 'Liveness', 'Startup', 'Audit'], 0, 'La liveness, elle, redémarre le conteneur.'],
    ['Que décide le scheduler ?', ['Sur quel nœud placer un pod', 'Quelle image construire', 'Quel DNS utiliser', 'Quelle version de Git'], 0, 'Il se base notamment sur les requests.'],
    ['Quelle ressource cloisonne le trafic entre pods ?', ['NetworkPolicy', 'ConfigMap', 'PersistentVolume', 'Job'], 0, 'Le plugin réseau doit la prendre en charge.'],
    ['Quel objet garantit l\'identité stable des pods d\'une base ?', ['StatefulSet', 'Deployment', 'DaemonSet', 'Service'], 0, 'Chaque pod garde son nom et son volume.'],
    ['Où l\'état du cluster est-il stocké ?', ['etcd', 'kubelet', 'CoreDNS', 'Docker Hub'], 0, 'Sauvegarder etcd, c\'est sauvegarder le cluster.'],
    ['Un Secret Kubernetes est-il chiffré par défaut ?', ['Non, seulement encodé en base64', 'Oui, toujours', 'Oui, avec Vault', 'Il n\'existe pas'], 0, 'Active le chiffrement au repos et limite les accès avec RBAC.'],
  ],
  project: {
    t: 'Boutique sur Kubernetes',
    b: 'Déploie l\'application [Online Boutique](https://github.com/GoogleCloudPlatform/microservices-demo) ou la tienne sur un cluster kind ou k3d.',
    s: ['Créer un cluster local à trois nœuds', 'Écrire Deployments, Services, ConfigMaps et Secrets', 'Ajouter requests, limits et sondes partout', 'Exposer l\'application avec une Gateway ou un Ingress', 'Configurer un HPA et le tester avec une charge `k6`', 'Isoler le namespace avec des NetworkPolicies', 'Provoquer une panne de nœud et observer la reprise'],
    d: 'le HPA ajoute des pods sous charge et l\'application reste disponible pendant une mise à jour et la perte d\'un nœud.',
    x: 'Installe un opérateur PostgreSQL et teste une bascule de la base.',
  },
  links: [
    ['Documentation Kubernetes', 'https://kubernetes.io/fr/docs/home/', 'doc'],
    ['Killercoda Kubernetes', 'https://killercoda.com/playgrounds/scenario/kubernetes', 'lab'],
    ['Kubernetes the Hard Way', 'https://github.com/kelseyhightower/kubernetes-the-hard-way', 'repo'],
    ['kind', 'https://kind.sigs.k8s.io/', 'doc'],
    ['Gateway API', 'https://gateway-api.sigs.k8s.io/', 'doc'],
    ['Roadmap Kubernetes', 'https://roadmap.sh/kubernetes', 'cours'],
    ['CKA, certification', 'https://training.linuxfoundation.org/certification/certified-kubernetes-administrator-cka/', 'cours'],
    ['Lens / k9s pour explorer', 'https://k9scli.io/', 'doc'],
  ],
});

M({
  id: 'helm', name: 'Helm', stage: 'conteneurs', icon: 'helm', h: 8, pre: ['k8s'],
  pitch: 'Le gestionnaire de paquets de Kubernetes : des manifestes paramétrables et versionnés.',
  l: [[
    ['Installer un chart', `Un **chart** est un paquet de manifestes Kubernetes. Une **release** est une installation de ce chart. \`values.yaml\` contient les paramètres que tu peux changer.`, `helm repo add podinfo https://stefanprodan.github.io/podinfo
helm repo update
helm search repo podinfo
helm show values podinfo/podinfo | less
helm install demo podinfo/podinfo --set replicaCount=3 -n demo --create-namespace
helm list -A
helm status demo -n demo`, 'bash'],
  ], [
    ['Écrire son chart', `Les templates utilisent la syntaxe Go. \`.Values\` lit les paramètres, \`.Release\` les informations de déploiement et \`_helpers.tpl\` les fragments réutilisables. Teste toujours avec \`helm template\`.`, `# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "api.fullname" . }}
spec:
  replicas: {{ .Values.replicaCount }}
  template:
    spec:
      containers:
        - name: api
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          {{- with .Values.resources }}
          resources: {{- toYaml . | nindent 12 }}
          {{- end }}`, 'yaml', 'Les erreurs d\'indentation sont le piège classique. Utilise `nindent` et contrôle le rendu avec `helm template . | kubeconform`.'],
  ], [
    ['Cycle de vie et distribution', `Les **hooks** lancent une migration de base avant une mise à jour. \`--atomic\` annule automatiquement en cas d'échec. Les charts se publient sur un registre **OCI**, comme des images, et les tests se lancent avec \`helm test\` et \`helm unittest\`.`, `helm upgrade --install api ./chart -f values-prod.yaml \\
  --atomic --timeout 5m -n boutique
helm history api -n boutique
helm rollback api 12 -n boutique

helm package ./chart
helm push api-1.4.0.tgz oci://ghcr.io/acme/charts`, 'bash'],
  ]],
  lab: {
    ctx: 'Déploie Podinfo, personnalise-le, puis reviens en arrière après une mauvaise mise à jour.',
    real: ['Quickstart Helm', 'https://helm.sh/docs/intro/quickstart/'],
    prompt: 'ops@bastion:~$',
    steps: [
      ['Ajoute le dépôt `podinfo` : https://stefanprodan.github.io/podinfo', '^helm repo add podinfo https://stefanprodan\\.github\\.io/podinfo', 'helm repo add podinfo https://stefanprodan.github.io/podinfo', '"podinfo" has been added to your repositories'],
      ['Installe la release `demo` à partir de `podinfo/podinfo`.', '^helm (install|upgrade --install) demo podinfo/podinfo', 'helm install demo podinfo/podinfo', 'NAME: demo\nSTATUS: deployed\nREVISION: 1'],
      ['Mets à jour avec `replicaCount=3`.', '^helm upgrade demo podinfo/podinfo .*--set replicaCount=3', 'helm upgrade demo podinfo/podinfo --set replicaCount=3', 'Release "demo" has been upgraded.\nREVISION: 2'],
      ['Affiche l\'historique de la release.', '^helm history demo', 'helm history demo', `REVISION  STATUS      DESCRIPTION
1         superseded  Install complete
2         deployed    Upgrade complete`],
      ['Reviens à la révision 1.', '^helm rollback demo 1', 'helm rollback demo 1', 'Rollback was a success! Happy Helming!'],
    ],
  },
  quiz: [
    ['Qu\'est-ce qu\'une release Helm ?', ['Une installation d\'un chart dans le cluster', 'Un dépôt Git', 'Une image Docker', 'Un nœud'], 0, 'Un même chart peut produire plusieurs releases.'],
    ['Quelle option annule une mise à jour ratée automatiquement ?', ['`--atomic`', '`--debug`', '`--dry-run`', '`--verify`'], 0, 'Elle attend la réussite et revient en arrière sinon.'],
    ['Comment voir le YAML généré sans déployer ?', ['`helm template`', '`helm push`', '`helm lint --fix`', '`helm delete`'], 0, 'Le rendu reste local.'],
  ],
  project: {
    t: 'Un chart pour ton API',
    b: 'Package l\'application du module Kubernetes.',
    s: ['Créer le chart avec `helm create`', 'Paramétrer image, réplicas, ressources et HPA', 'Ajouter `values-staging.yaml` et `values-prod.yaml`', 'Ajouter un hook de migration de base', 'Valider avec `helm lint` et kubeconform', 'Publier le chart sur un registre OCI'],
    d: 'une même commande déploie staging ou prod en ne changeant que le fichier de valeurs.',
  },
  links: [
    ['Documentation Helm', 'https://helm.sh/docs/', 'doc'],
    ['Artifact Hub', 'https://artifacthub.io/', 'lab'],
    ['Bonnes pratiques des charts', 'https://helm.sh/docs/chart_best_practices/', 'doc'],
    ['helm-unittest', 'https://github.com/helm-unittest/helm-unittest', 'repo'],
  ],
});
