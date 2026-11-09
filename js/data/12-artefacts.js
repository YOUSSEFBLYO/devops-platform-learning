M({
  id: 'artifactory', name: 'Artifactory', stage: 'artefacts', icon: 'jfrog', h: 7, sim: 'registry', simCfg: { reg: 'Artifactory' }, pre: ['docker'],
  pitch: 'Le dépôt universel de JFrog : un seul endroit pour Docker, npm, Maven, PyPI et bien d\'autres.',
  l: [[
    ['Trois types de dépôts', `Un dépôt **local** stocke tes artefacts, un **remote** met en cache une source externe (npm, Docker Hub) et un **virtual** combine les deux derrière une seule URL. Ta CI et tes développeurs n'utilisent que l'URL virtuelle.`, `jf c add acme --url https://acme.jfrog.io --access-token $TOKEN
jf rt upload "dist/*.tgz" npm-local/boutique/
jf rt search "npm-local/boutique/*"
jf docker push acme.jfrog.io/docker-local/api:1.4 --build-name=api --build-number=42`, 'bash', 'Passer par un dépôt remote protège aussi contre la disparition d\'un paquet public et réduit la dépendance à Docker Hub.'],
  ], [
    ['Build info et promotion', `Le **build info** enregistre ce qu'un build a produit, avec quelles dépendances. La **promotion** déplace un artefact validé d'un dépôt à l'autre sans le reconstruire. Les noms de dépôts suivent souvent le schéma \`projet-type-maturité\`.`, `jf rt build-collect-env api 42
jf rt build-add-git api 42
jf rt build-publish api 42

jf rt build-promote api 42 docker-prod-local \\
  --source-repo=docker-dev-local --status=Released --copy=true`, 'bash'],
  ], [
    ['Sécurité et rétention', `**JFrog Xray** scanne les artefacts et peut bloquer un téléchargement dangereux. Les **Release Bundles** signent un ensemble d'artefacts. Le nettoyage se pilote avec **AQL** et des règles de rétention.`, `# cleanup.json : artefacts jamais téléchargés depuis 90 jours
{
  "files": [{
    "aql": {
      "items.find": {
        "repo": "docker-dev-local",
        "stat.downloaded": { "$before": "90d" },
        "created": { "$before": "90d" }
      }
    }
  }]
}
# jf rt delete --spec cleanup.json --dry-run`, 'json'],
  ]],
  lab: {
    ctx: 'Publie une image et promeus-la avec la CLI JFrog.',
    real: ['JFrog Academy', 'https://academy.jfrog.com/'],
    prompt: 'ci@runner:~/api$',
    steps: [
      ['Vérifie la connexion.', '^jf rt ping', 'jf rt ping', 'OK'],
      ['Pousse `acme.jfrog.io/docker-dev-local/api:1.4` avec le build `api` numéro `42`.', '^jf docker push .*--build-name[ =]api .*--build-number[ =]42', 'jf docker push acme.jfrog.io/docker-dev-local/api:1.4 --build-name=api --build-number=42', 'Pushed 1.4 digest sha256:7e21…'],
      ['Publie le build info.', '^jf rt (bp|build-publish) api 42', 'jf rt build-publish api 42', 'Build info successfully deployed.'],
      ['Promeus-le vers `docker-prod-local`.', '^jf rt (bpr|build-promote) api 42 docker-prod-local', 'jf rt build-promote api 42 docker-prod-local --status=Released', 'Promoted build api/42 to docker-prod-local'],
    ],
  },
  quiz: [
    ['À quoi sert un dépôt virtual ?', ['Combiner local et remote derrière une URL', 'Faire tourner une VM', 'Chiffrer les images', 'Supprimer le cache'], 0, 'Les clients n\'ont qu\'une seule adresse.'],
    ['Pourquoi promouvoir plutôt que reconstruire ?', ['Pour livrer exactement ce qui a été testé', 'Pour gagner de la place', 'Pour changer le code', 'Par mode'], 0, 'Reconstruire peut introduire une différence.'],
    ['Quel produit scanne les artefacts ?', ['JFrog Xray', 'JFrog Pipelines seulement', 'Grafana', 'Consul'], 0, 'Il croise les composants avec les bases de vulnérabilités.'],
  ],
  project: {
    t: 'Registre unique d\'équipe',
    b: 'Utilise l\'essai gratuit de JFrog ou Artifactory OSS en conteneur.',
    s: ['Créer des dépôts local, remote et virtual pour npm et Docker', 'Faire passer toute la CI par ce registre', 'Publier le build info', 'Promouvoir de dev vers prod', 'Écrire une règle de nettoyage AQL'],
    d: 'un build tourne même lorsque l\'accès direct au registre public est bloqué.',
  },
  links: [
    ['Documentation JFrog', 'https://jfrog.com/help/', 'doc'],
    ['JFrog CLI', 'https://docs.jfrog.com/integrations/docs/jfrog-cli', 'doc'],
    ['JFrog Academy', 'https://academy.jfrog.com/', 'cours'],
  ],
});

M({
  id: 'nexus', name: 'Nexus', stage: 'artefacts', icon: 'sonatype', h: 6, sim: 'registry', simCfg: { reg: 'Nexus' }, pre: ['docker'],
  pitch: 'Le gestionnaire de dépôts de Sonatype, très répandu dans le monde Java et en entreprise.',
  l: [[
    ['Hosted, proxy et group', `Nexus Repository propose trois types : **hosted** pour tes artefacts, **proxy** pour le cache d'une source externe, **group** pour les réunir. Il s'installe facilement dans Docker.`, `docker run -d --name nexus -p 8081:8081 \\
  -v nexus-data:/nexus-data sonatype/nexus3

docker exec nexus cat /nexus-data/admin.password

# ~/.m2/settings.xml ou npm :
npm config set registry http://localhost:8081/repository/npm-group/`, 'bash'],
  ], [
    ['Publier et sécuriser', `Publie avec tes outils habituels : \`mvn deploy\`, \`npm publish\`, \`docker push\`. Crée des **rôles** limités et des **utilisateurs techniques** pour la CI. Les **Content Selectors** restreignent l'accès à un chemin précis.`, `<!-- pom.xml -->
<distributionManagement>
  <repository>
    <id>nexus</id>
    <url>http://nexus:8081/repository/maven-releases/</url>
  </repository>
  <snapshotRepository>
    <id>nexus</id>
    <url>http://nexus:8081/repository/maven-snapshots/</url>
  </snapshotRepository>
</distributionManagement>`, 'xml'],
  ], [
    ['Nettoyage et API', `Sans nettoyage, le disque déborde. Les **Cleanup Policies** et les **tâches planifiées** libèrent de l'espace : il faut aussi lancer le **compactage** du blob store. L'API REST et **Nexus Lifecycle** automatisent la gouvernance.`, `# Lister les composants d'un dépôt
curl -u ci:$TOKEN \\
  "http://nexus:8081/service/rest/v1/components?repository=docker-hosted"

# Rechercher une image précise
curl -u ci:$TOKEN \\
  "http://nexus:8081/service/rest/v1/search?repository=docker-hosted&name=api&version=1.4"`, 'bash', 'Supprimer des composants ne libère l\'espace qu\'après l\'exécution de la tâche de compactage du blob store.'],
  ]],
  lab: {
    ctx: 'Installe Nexus et fais passer npm par son proxy.',
    real: ['Sonatype Learn', 'https://learn.sonatype.com/'],
    prompt: 'ops@laptop:~$',
    steps: [
      ['Lance `sonatype/nexus3` nommé `nexus`, port 8081.', '^docker run .*sonatype/nexus3', 'docker run -d --name nexus -p 8081:8081 -v nexus-data:/nexus-data sonatype/nexus3', 'b81c44f0e2a7'],
      ['Lis le mot de passe administrateur.', '^docker exec nexus cat /nexus-data/admin\\.password', 'docker exec nexus cat /nexus-data/admin.password', '8e1f4a2c-77d1-4e6c-bb9e-1a2d3c4f5e6a'],
      ['Configure npm vers `http://localhost:8081/repository/npm-group/`.', '^npm config set registry http://localhost:8081/repository/npm-group/?', 'npm config set registry http://localhost:8081/repository/npm-group/', ''],
      ['Installe `express`.', '^npm (i|install) express', 'npm install express', 'added 64 packages in 3s (servis depuis le proxy Nexus)'],
    ],
  },
  quiz: [
    ['Quel type de dépôt met en cache une source externe ?', ['Proxy', 'Hosted', 'Group', 'Blob'], 0, 'Il conserve une copie locale.'],
    ['Que faut-il lancer pour libérer réellement l\'espace ?', ['Le compactage du blob store', 'Un redémarrage', '`docker prune`', 'Rien'], 0, 'La suppression est d\'abord logique.'],
    ['Pourquoi un utilisateur technique pour la CI ?', ['Pour limiter les droits et les tracer', 'Pour aller plus vite', 'C\'est obligatoire', 'Pour éviter HTTPS'], 0, 'Le compte humain ne doit pas circuler.'],
  ],
  project: {
    t: 'Proxy d\'entreprise',
    b: 'Monte un Nexus qui sert tous les paquets de l\'équipe.',
    s: ['Installer Nexus avec un volume persistant', 'Configurer les proxys npm, PyPI et Docker', 'Créer un dépôt group par format', 'Publier un paquet interne', 'Automatiser le nettoyage'],
    d: 'la CI fonctionne uniquement via Nexus et les téléchargements répétés deviennent plus rapides.',
  },
  links: [
    ['Documentation Nexus', 'https://help.sonatype.com/en/sonatype-nexus-repository.html', 'doc'],
    ['Image Docker', 'https://hub.docker.com/r/sonatype/nexus3', 'doc'],
    ['Sonatype Learn', 'https://learn.sonatype.com/', 'cours'],
  ],
});

M({
  id: 'harbor', name: 'Harbor', stage: 'artefacts', icon: 'harbor', h: 7, sim: 'registry', simCfg: { reg: 'Harbor' }, pre: ['k8s'],
  pitch: 'Un registre de conteneurs open source de la CNCF, avec scan, signature et réplication.',
  l: [[
    ['Projets et robots', `Harbor organise les images en **projets**, avec des membres et des quotas. Les **comptes robots** donnent à la CI un accès limité. Il s'installe avec Helm sur Kubernetes.`, `helm repo add harbor https://helm.goharbor.io
helm install harbor harbor/harbor -n harbor --create-namespace \\
  --set expose.ingress.hosts.core=harbor.acme.fr \\
  --set externalURL=https://harbor.acme.fr

docker login harbor.acme.fr -u 'robot$ci'
docker push harbor.acme.fr/boutique/api:1.4`, 'bash'],
  ], [
    ['Scan et politiques', `**Trivy** est intégré. Un projet peut empêcher le téléchargement d'une image vulnérable au-delà d'un seuil. Les **règles de tag** rendent certaines versions immuables, et les **règles de rétention** nettoient le reste.`, `# Déclencher un scan par l'API
curl -u "robot\\$ci:$TOKEN" -X POST \\
  https://harbor.acme.fr/api/v2.0/projects/boutique/repositories/api/artifacts/1.4/scan

# Lire les failles
curl -u "robot\\$ci:$TOKEN" \\
  "https://harbor.acme.fr/api/v2.0/projects/boutique/repositories/api/artifacts/1.4/additions/vulnerabilities"`, 'bash'],
  ], [
    ['Signature et réplication', `Harbor stocke les signatures **Cosign** et peut refuser les images non signées. La **réplication** copie les images entre registres pour rapprocher les données ou préparer un plan de reprise. Le **proxy cache** évite les limites de Docker Hub.`, `cosign sign --key cosign.key harbor.acme.fr/boutique/api@sha256:7e21…
cosign verify --key cosign.pub harbor.acme.fr/boutique/api@sha256:7e21…

# Kyverno : refuser une image non signée en production
# verifyImages:
#   - imageReferences: ["harbor.acme.fr/boutique/*"]
#     attestors: [{ entries: [{ keys: { publicKeys: "…" } }] }]`, 'bash'],
  ]],
  lab: {
    ctx: 'Publie, signe et vérifie une image dans Harbor.',
    real: ['Documentation Harbor', 'https://goharbor.io/docs/'],
    prompt: 'ci@runner:~/api$',
    steps: [
      ['Connecte-toi à `harbor.acme.fr`.', '^docker login harbor\\.acme\\.fr', 'docker login harbor.acme.fr', 'Login Succeeded'],
      ['Tague `api:1.4` vers `harbor.acme.fr/boutique/api:1.4`.', '^docker (image )?tag api:1\\.4 harbor\\.acme\\.fr/boutique/api:1\\.4', 'docker tag api:1.4 harbor.acme.fr/boutique/api:1.4', ''],
      ['Pousse-la.', '^docker (image )?push harbor\\.acme\\.fr/boutique/api:1\\.4', 'docker push harbor.acme.fr/boutique/api:1.4', '1.4: digest: sha256:7e21… size: 1782'],
      ['Signe-la avec Cosign et la clé `cosign.key`.', '^cosign sign .*--key cosign\\.key .*harbor\\.acme\\.fr/boutique/api', 'cosign sign --key cosign.key harbor.acme.fr/boutique/api:1.4', 'Pushing signature to: harbor.acme.fr/boutique/api'],
      ['Vérifie la signature avec `cosign.pub`.', '^cosign verify .*--key cosign\\.pub .*harbor\\.acme\\.fr/boutique/api', 'cosign verify --key cosign.pub harbor.acme.fr/boutique/api:1.4', 'The cosign claims were validated\nThe signatures were verified against the specified public key'],
    ],
  },
  quiz: [
    ['Quel scanner est intégré à Harbor ?', ['Trivy', 'Nessus', 'ClamAV', 'Snort'], 0, 'D\'autres peuvent être branchés.'],
    ['Pourquoi utiliser un compte robot ?', ['Pour limiter les droits de la CI', 'Pour accélérer les pushes', 'Pour chiffrer le disque', 'Pour éviter les tags'], 0, 'Il n\'a accès qu\'à un projet et à certaines actions.'],
    ['Que permet la réplication ?', ['Copier les images entre registres', 'Dupliquer un pod', 'Réécrire un tag', 'Chiffrer Git'], 0, 'Utile pour le multi-région et la reprise.'],
  ],
  project: {
    t: 'Registre privé sécurisé',
    b: 'Installe Harbor sur ton cluster local.',
    s: ['Installer Harbor avec Helm et TLS', 'Créer un projet et un compte robot', 'Interdire le pull d\'images à faille critique', 'Signer les images en CI avec Cosign', 'Répliquer vers un second registre', 'Ajouter des règles de rétention'],
    d: 'une image vulnérable ou non signée ne peut pas démarrer dans le cluster.',
  },
  links: [
    ['Documentation Harbor', 'https://goharbor.io/docs/', 'doc'],
    ['Sigstore Cosign', 'https://docs.sigstore.dev/cosign/signing/overview/', 'doc'],
    ['Kyverno, vérifier les images', 'https://kyverno.io/docs/', 'doc'],
  ],
});
