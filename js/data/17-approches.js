M({
  id: 'a-cicd', name: 'CI/CD', stage: 'approches', mono: 'CI', h: 6, sim: 'pipeline', simCfg: { ci: 'le pipeline' }, pre: ['git'],
  pitch: 'Intégrer souvent, livrer sans drame : chaque commit suit le même chemin automatisé.',
  l: [[
    ['Intégration, livraison, déploiement', `**L'intégration continue** fusionne et teste chaque changement. **La livraison continue** garde le code prêt à partir, avec une validation humaine. **Le déploiement continu** envoie en production sans intervention.

Le gain vient de la taille des lots : un petit changement se relit, se teste et s'annule facilement.`],
  ], [
    ['Le pipeline type', `Ordre conseillé : du plus rapide au plus lent, pour échouer tôt. Construis l'artefact **une seule fois**, puis promeus-le d'un environnement à l'autre.

- lint et tests unitaires
- build et scan de l'image
- tests d'intégration
- staging, puis production progressive`, `build -> image:sha -> staging -> tests -> prod (même image:sha)`, 'text', 'Reconstruire par environnement revient à tester un artefact et à en livrer un autre.'],
  ], [
    ['Mesurer avec DORA', `Quatre métriques DORA décrivent la performance d'une équipe : fréquence de déploiement, délai de mise en production, taux d'échec des changements, temps de restauration.

Les feature flags séparent **déployer** et **activer** : le code part éteint, puis s'active pour 1 % des utilisateurs.`, `# Délai de mise en production d'un commit
git log -1 --format=%cI <sha>   # date du commit
gh run view <run> --json updatedAt --jq .updatedAt   # date du déploiement`, 'bash'],
  ]],
  quiz: [
    ['Différence entre livraison et déploiement continus ?', ['La livraison garde une validation humaine', 'Aucune', 'Le déploiement exclut les tests', 'La livraison exclut Git'], 0, 'Le déploiement continu va jusqu\'en production seul.'],
    ['Pourquoi construire l\'artefact une seule fois ?', ['Pour livrer exactement ce qui a été testé', 'Pour économiser un fichier', 'Par habitude', 'Pour éviter Git'], 0, 'C\'est le principe « build once, deploy many ».'],
    ['Que permet un feature flag ?', ['Déployer sans activer', 'Chiffrer le code', 'Remplacer les tests', 'Supprimer les branches'], 0, 'L\'activation devient progressive et réversible.'],
  ],
  project: {
    t: 'Tableau DORA',
    b: 'Mesure ton propre pipeline.',
    s: ['Choisir un dépôt avec une CI réelle', 'Calculer les 4 métriques DORA sur 30 jours', 'Identifier l\'étape la plus lente', 'Réduire sa durée', 'Afficher le résultat dans Grafana'],
    d: 'tu présentes une amélioration chiffrée de ton délai de mise en production.',
  },
  links: [
    ['DORA', 'https://dora.dev/', 'doc'],
    ['Continuous Delivery', 'https://continuousdelivery.com/', 'book'],
    ['Feature Toggles par Martin Fowler', 'https://martinfowler.com/articles/feature-toggles.html', 'blog'],
    ['Roadmap DevOps', 'https://roadmap.sh/devops', 'cours'],
  ],
});

M({
  id: 'a-iac', name: 'Infrastructure as Code', stage: 'approches', mono: 'IaC', h: 5, sim: 'tfplan', simCfg: { tool: 'terraform' }, pre: ['terraform'],
  pitch: 'L\'infrastructure se décrit, se relit, se teste et se recrée comme du logiciel.',
  l: [[
    ['Déclaratif ou impératif', `L'approche **impérative** liste des étapes. L'approche **déclarative** décrit le résultat, et l'outil calcule les étapes. La seconde gère mieux les relances et la dérive.

Le code d'infrastructure passe par les mêmes étapes que le reste : Git, revue, tests.`],
  ], [
    ['Provisionner et configurer', `Terraform, Pulumi ou CloudFormation **créent** les ressources. Ansible, Chef ou Puppet **configurent** ce qu'il y a dedans. Avec les images immuables et Kubernetes, on configure de moins en moins après le démarrage : on remplace.`],
  ], [
    ['Immutabilité et dérive', `Une **infrastructure immuable** ne se modifie pas : on construit une nouvelle image et on remplace l'ancienne. Cela élimine les serveurs « flocons de neige ».

Détecte la **dérive** avec un plan planifié, et interdis les changements manuels en production avec des droits en lecture seule.`, `# Détection de dérive en CI, chaque nuit
terraform plan -detailed-exitcode
# 0 = rien à faire, 2 = dérive ou changement, 1 = erreur`, 'bash'],
  ]],
  quiz: [
    ['Qu\'est-ce que la dérive ?', ['Un écart entre le code et le réel', 'Un bug de Git', 'Une latence réseau', 'Une panne DNS'], 0, 'Elle vient souvent de modifications manuelles.'],
    ['Que signifie immuable ?', ['On remplace plutôt que de modifier', 'On ne redémarre jamais', 'On n\'utilise pas Git', 'On reste sur Windows'], 0, 'Chaque version est une image complète.'],
    ['Quel outil relève du provisioning ?', ['Terraform', 'Ansible uniquement', 'grep', 'Grafana'], 0, 'Il crée les ressources cloud.'],
  ],
  project: {
    t: 'Reconstruire en 30 minutes',
    b: 'Prouve que ton infrastructure ne vit que dans le code.',
    s: ['Décrire un environnement complet', 'Tout détruire', 'Chronométrer sa reconstruction', 'Ajouter une détection nocturne de dérive', 'Interdire les droits d\'écriture manuels en production'],
    d: 'l\'environnement revient seul en moins de 30 minutes.',
  },
  links: [
    ['Infrastructure as Code, Kief Morris', 'https://infrastructure-as-code.com/', 'book'],
    ['The Twelve-Factor App', 'https://12factor.net/fr/', 'doc'],
    ['Packer, images immuables', 'https://developer.hashicorp.com/packer/docs', 'doc'],
  ],
});

M({
  id: 'a-gitops', name: 'GitOps', stage: 'approches', mono: 'Ops', h: 5, sim: 'gitops', pre: ['argocd'],
  pitch: 'Git décrit l\'état voulu, un agent le fait respecter en continu.',
  l: [[
    ['Les quatre principes', `OpenGitOps définit quatre principes :

1. L'état voulu est **déclaratif**
2. Il est **versionné et immuable**
3. Il est **récupéré automatiquement** par un agent
4. Il est **réconcilié en continu**

Un déploiement devient une pull request, et un retour arrière un \`git revert\`.`],
  ], [
    ['Pull contre push', `En **push**, la CI possède des droits sur le cluster. En **pull**, un agent interne lit Git : aucune clé de production ne sort du cluster.

La CI construit l'image et met à jour le dépôt de déploiement. L'agent s'occupe du reste.`, `CI : test -> build -> push image -> commit du tag dans le dépôt deploy
CD : l'agent voit le commit -> compare -> synchronise`, 'text'],
  ], [
    ['Organiser à l\'échelle', `Sépare code et configuration. Évite une branche par environnement : préfère un dossier par environnement avec Kustomize ou Helm. La promotion devient un changement de fichier, relu comme tout le reste.`, `deploy/
├── base/
└── overlays/
    ├── dev/       # tag 1.5.0
    ├── staging/   # tag 1.4.2
    └── prod/      # tag 1.4.1`, 'text', 'Les branches par environnement divergent vite. Un dossier par environnement garde les différences visibles dans un seul diff.'],
  ]],
  quiz: [
    ['Pourquoi le modèle pull est-il plus sûr ?', ['La CI n\'a pas besoin d\'accès au cluster', 'Il est plus coloré', 'Il supprime Git', 'Il évite les images'], 0, 'Les droits restent dans le cluster.'],
    ['Comment revenir en arrière ?', ['Avec `git revert`', 'Avec `kubectl delete`', 'En éteignant le cluster', 'C\'est impossible'], 0, 'L\'agent applique l\'ancien état.'],
    ['Comment représenter les environnements ?', ['Par dossiers', 'Par e-mails', 'Par images différentes du même code uniquement', 'Par clusters sans Git'], 0, 'Les différences restent lisibles.'],
  ],
  project: {
    t: 'Promotion par pull request',
    b: 'Mets en place une promotion complète entre environnements.',
    s: ['Créer un dépôt de déploiement avec overlays', 'Connecter un agent GitOps', 'Faire mettre à jour le tag par la CI', 'Promouvoir vers prod par une PR', 'Annuler par `git revert`'],
    d: 'aucun `kubectl apply` manuel n\'est nécessaire du début à la fin.',
  },
  links: [
    ['OpenGitOps', 'https://opengitops.dev/', 'doc'],
    ['Guide GitOps de CNCF', 'https://www.cncf.io/projects/argo/', 'doc'],
    ['Kustomize', 'https://kustomize.io/', 'doc'],
  ],
});

M({
  id: 'a-conteneurs', name: 'Containerisation', stage: 'approches', mono: 'Ct', h: 4, sim: 'layers', pre: ['docker'],
  pitch: 'Séparer l\'application de la machine : même artefact, du portable à la production.',
  l: [[
    ['Pourquoi des conteneurs', `Une **VM** embarque un système complet. Un **conteneur** partage le noyau de l'hôte et n'embarque que l'application et ses dépendances. Il démarre plus vite et se déploie à l'identique partout.`],
  ], [
    ['Les 12 facteurs', `Une application conteneurisée doit être **sans état** : configuration dans l'environnement, données dans un service externe, logs sur stdout, arrêt propre sur \`SIGTERM\`.

Ces règles viennent de **The Twelve-Factor App**.`, `# Logs sur stdout, configuration par variable
docker run -e DATABASE_URL=$DATABASE_URL acme/api:1.4
docker logs -f api`, 'bash'],
  ], [
    ['Standards OCI et chaîne de confiance', `**OCI** normalise le format d'image et le runtime. Docker, containerd, Podman ou CRI-O sont donc interchangeables. La sécurité couvre toute la chaîne : image de base, SBOM, scan, signature et admission dans le cluster.`, `podman build -t acme/api:1.4 .   # même Dockerfile, sans démon
syft acme/api:1.4 -o spdx-json > sbom.json
grype sbom:sbom.json`, 'bash'],
  ]],
  quiz: [
    ['Que partage un conteneur avec l\'hôte ?', ['Le noyau', 'Le BIOS', 'Rien du tout', 'Tous les fichiers'], 0, 'C\'est pour cela qu\'il est si léger.'],
    ['Où écrire les logs ?', ['Sur stdout', 'Dans l\'image', 'Dans le DNS', 'Dans `/etc/hosts`'], 0, 'L\'orchestrateur les collecte.'],
    ['Que normalise OCI ?', ['Le format d\'image et le runtime', 'Les mots de passe', 'Le HTML', 'Les factures'], 0, 'L\'écosystème reste ouvert.'],
  ],
  project: {
    t: 'Application 12 facteurs',
    b: 'Rends une application existante conforme.',
    s: ['Auditer l\'application selon les 12 facteurs', 'Sortir la configuration vers l\'environnement', 'Sortir l\'état vers un service externe', 'Envoyer les logs sur stdout', 'Gérer `SIGTERM`', 'Générer un SBOM'],
    d: 'l\'application tourne en plusieurs copies sans partager aucun fichier local.',
  },
  links: [
    ['The Twelve-Factor App', 'https://12factor.net/fr/', 'doc'],
    ['Open Container Initiative', 'https://opencontainers.org/', 'doc'],
    ['Podman', 'https://podman.io/docs', 'doc'],
    ['Syft', 'https://github.com/anchore/syft', 'repo'],
  ],
});

M({
  id: 'a-orchestration', name: 'Orchestration de conteneurs', stage: 'approches', mono: 'Or', h: 4, sim: 'pods', pre: ['k8s'],
  pitch: 'Confier le placement, la reprise et la mise à l\'échelle à une boucle de contrôle.',
  l: [[
    ['Le rôle d\'un orchestrateur', `Dès qu'il y a plusieurs conteneurs sur plusieurs machines, il faut les placer, les relancer, les exposer et les mettre à jour. Un orchestrateur fait tout cela à partir d'un **état voulu**.`],
  ], [
    ['Choisir son niveau', `Choisis selon ton besoin réel, du plus simple au plus puissant :

- Compose sur une machine
- Docker Swarm pour un petit cluster
- ECS, Cloud Run, Container Apps pour un service managé
- Kubernetes pour un écosystème complet`],
  ], [
    ['Stratégies de déploiement', `**Rolling** remplace progressivement. **Blue-green** bascule d'un coup entre deux environnements. **Canari** expose une petite part du trafic. **Shadow** copie le trafic sans impact client. Le choix dépend du coût d'une erreur.`, `Rolling   : simple, versions mêlées quelque temps
Blue-green: bascule instantanée, coût doublé
Canari    : risque minimal, métriques obligatoires
Shadow    : aucun risque client, complexe à mettre en place`, 'text'],
  ]],
  quiz: [
    ['Que fait une boucle de contrôle ?', ['Elle corrige l\'écart avec l\'état voulu', 'Elle compile le code', 'Elle crée des commits', 'Elle envoie des mails'], 0, 'C\'est le cœur de Kubernetes.'],
    ['Quelle stratégie expose une petite part du trafic ?', ['Canari', 'Recreate', 'Blue-green', 'Rolling'], 0, 'Elle limite l\'impact d\'un bug.'],
    ['Quand éviter Kubernetes ?', ['Pour une petite application sans besoin d\'échelle', 'Jamais', 'Sur Linux', 'Avec Git'], 0, 'Sa complexité doit se justifier.'],
  ],
  project: {
    t: 'Comparer trois stratégies',
    b: 'Déploie la même application avec trois stratégies.',
    s: ['Déployer en rolling update', 'Déployer en blue-green', 'Déployer en canari', 'Mesurer les erreurs pendant chaque bascule', 'Écrire une recommandation'],
    d: 'tu sais quelle stratégie choisir selon le risque, le coût et le temps de bascule.',
  },
  links: [
    ['Stratégies de déploiement', 'https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#strategy', 'doc'],
    ['Amazon ECS', 'https://docs.aws.amazon.com/ecs/', 'doc'],
    ['CNCF Landscape', 'https://landscape.cncf.io/', 'doc'],
  ],
});

M({
  id: 'a-mesh', name: 'Service mesh', stage: 'approches', mono: 'SM', h: 4, sim: 'mesh', pre: ['k8s'],
  pitch: 'Sortir la résilience et la sécurité du code pour les placer dans l\'infrastructure.',
  l: [[
    ['Plan de données et plan de contrôle', `Le **plan de données** (des proxys) transporte le trafic. Le **plan de contrôle** les configure. Les applications n'ont plus à implémenter retries, mTLS ou métriques.`],
  ], [
    ['Les trois apports', `- **Trafic** : canari, retries, timeouts, disjoncteur
- **Sécurité** : mTLS et autorisation par identité
- **Observabilité** : débit, erreurs et latence pour chaque service, sans code`],
  ], [
    ['En avez-vous besoin ?', `Un mesh ajoute de la complexité et un coût. Il se justifie avec de nombreux services, du zero trust imposé, ou plusieurs langages à harmoniser.

Pour peu de services, la Gateway API, les NetworkPolicies et une bibliothèque suffisent souvent. Le mode sans sidecar réduit ce coût.`],
  ]],
  quiz: [
    ['Quel est le rôle du plan de contrôle ?', ['Configurer les proxys', 'Transporter les paquets', 'Stocker les images', 'Compiler'], 0, 'Le trafic ne le traverse pas.'],
    ['Quel apport est gratuit pour les développeurs ?', ['Les métriques par service', 'L\'écriture des tests', 'Le design', 'Les migrations'], 0, 'Les proxys les produisent.'],
    ['Quand un mesh est-il excessif ?', ['Avec trois services simples', 'Avec 300 services', 'Avec du zero trust imposé', 'En multi-langage'], 0, 'Le coût dépasse alors le bénéfice.'],
  ],
  project: {
    t: 'Décision d\'architecture',
    b: 'Rédige un ADR sur l\'adoption d\'un mesh.',
    s: ['Mesurer le surcoût CPU et mémoire d\'Istio et de Linkerd', 'Mesurer la latence ajoutée', 'Lister les besoins réels', 'Comparer avec une solution sans mesh', 'Écrire la décision et ses conséquences'],
    d: 'ton ADR s\'appuie sur des mesures et propose une décision claire.',
  },
  links: [
    ['What is a service mesh, Buoyant', 'https://www.buoyant.io/service-mesh-manifesto', 'blog'],
    ['Istio ambient', 'https://istio.io/latest/docs/ambient/overview/', 'doc'],
    ['SPIFFE', 'https://spiffe.io/docs/latest/spiffe-about/overview/', 'doc'],
  ],
});

M({
  id: 'a-observabilite', name: 'Monitoring et observabilité', stage: 'approches', mono: 'Ob', h: 6, sim: 'metrics', pre: ['prometheus'],
  pitch: 'Le monitoring dit que quelque chose va mal, l\'observabilité permet de comprendre pourquoi.',
  l: [[
    ['Les trois signaux', `**Métriques** : des chiffres agrégés, peu coûteux. **Logs** : des événements détaillés. **Traces** : le trajet d'une requête.

Les **Golden Signals** de Google résument l'essentiel : latence, trafic, erreurs, saturation.`],
  ], [
    ['SLI, SLO, budget d\'erreur', `Le **SLI** mesure, par exemple la part de requêtes réussies. Le **SLO** fixe l'objectif, par exemple 99,9 % sur 30 jours. Le **budget d'erreur** est ce qu'il reste : 0,1 %, soit environ 43 minutes.

Si le budget est épuisé, on ralentit les livraisons pour fiabiliser.`, `# SLI de disponibilité sur 30 jours
sum(rate(http_requests_total{status!~"5.."}[30d]))
  / sum(rate(http_requests_total[30d]))`, 'promql'],
  ], [
    ['Alerter sur le rythme de consommation', `Une alerte sur seuil fixe réveille trop souvent. L'alerte par **burn rate** mesure la vitesse de consommation du budget. Avec un rythme de 14,4, le budget mensuel disparaît en deux jours : là, il faut réveiller quelqu'un.`, `(
  1 - sum(rate(http_requests_total{status!~"5.."}[1h])) / sum(rate(http_requests_total[1h]))
) > (14.4 * 0.001)
and
(
  1 - sum(rate(http_requests_total{status!~"5.."}[5m])) / sum(rate(http_requests_total[5m]))
) > (14.4 * 0.001)`, 'promql'],
  ]],
  quiz: [
    ['Que représente un SLO de 99,9 % sur 30 jours ?', ['Environ 43 minutes d\'indisponibilité tolérée', '1 seconde', '1 journée', 'Aucune tolérance'], 0, '0,1 % de 43 200 minutes.'],
    ['Lequel n\'est pas un Golden Signal ?', ['Le nombre de commits', 'La latence', 'Les erreurs', 'La saturation'], 0, 'Les quatre sont latence, trafic, erreurs, saturation.'],
    ['Quel signal suit une requête entre services ?', ['La trace', 'La métrique', 'Le log seul', 'Le ping'], 0, 'Elle relie tous les services traversés.'],
    ['Pourquoi deux fenêtres pour le burn rate ?', ['Pour réduire les fausses alertes et résoudre vite', 'Pour le style', 'Pour payer moins', 'C\'est obligatoire dans Git'], 0, 'La fenêtre courte confirme que le problème dure encore.'],
  ],
  project: {
    t: 'SLO de bout en bout',
    b: 'Définis et suis un vrai SLO.',
    s: ['Choisir un parcours utilisateur critique', 'Définir SLI et SLO', 'Créer le tableau du budget d\'erreur', 'Ajouter des alertes burn rate', 'Provoquer un incident et écrire un post-mortem'],
    d: 'l\'alerte part avant que le budget ne soit épuisé, et le post-mortem propose des actions concrètes.',
  },
  links: [
    ['Livres SRE de Google', 'https://sre.google/books/', 'book'],
    ['Alerting on SLOs', 'https://sre.google/workbook/alerting-on-slos/', 'doc'],
    ['Sloth, générateur de SLO', 'https://sloth.dev/', 'doc'],
    ['OpenSLO', 'https://openslo.com/', 'doc'],
  ],
});

M({
  id: 'a-secrets', name: 'Gestion des secrets', stage: 'approches', mono: 'Se', h: 4, sim: 'vault', pre: ['vault'],
  pitch: 'Réduire le nombre de secrets, leur durée de vie et les personnes qui peuvent les voir.',
  l: [[
    ['Les règles de base', `Un secret n'est jamais dans le code, ni dans une image, ni dans un log. Il est chiffré au repos, transmis par TLS, accessible au strict nécessaire, et son accès est journalisé.

Installe un détecteur comme **gitleaks** dès le premier jour.`, `gitleaks detect --source . --redact
gitleaks protect --staged   # en hook pre-commit`, 'bash'],
  ], [
    ['Choisir une méthode', `- **SOPS** ou **Sealed Secrets** : chiffrer dans Git, simple
- **Secrets Manager**, **Key Vault** : service du cloud, intégré
- **Vault** ou **OpenBao** : central, multi-cloud, secrets dynamiques
- **External Secrets** : relie ces coffres à Kubernetes`],
  ], [
    ['Sans secret du tout', `La meilleure approche, c'est de ne pas avoir de secret. L'**identité de charge de travail** (OIDC, IAM Roles, Workload Identity) remplace les clés par des jetons courts. La rotation automatique traite ce qui reste.

Prépare une procédure : que faire si un secret fuit ? Révoquer, faire tourner, enquêter.`],
  ]],
  quiz: [
    ['Quelle est la première action après une fuite ?', ['Révoquer le secret', 'Renommer le fichier', 'Attendre', 'Faire un rebase'], 0, 'Tout le reste vient après.'],
    ['Quelle approche supprime les clés de longue durée ?', ['L\'identité de charge de travail', 'Le base64', 'Un fichier `.env`', 'Le chiffrement ROT13'], 0, 'Des jetons courts sont délivrés automatiquement.'],
    ['Quand choisir Sealed Secrets ?', ['Pour un GitOps simple sur Kubernetes', 'Pour du multi-cloud complexe', 'Pour stocker des images', 'Jamais'], 0, 'Il reste limité au cluster.'],
  ],
  project: {
    t: 'Audit de secrets',
    b: 'Fais l\'inventaire d\'un projet et réduis les risques.',
    s: ['Scanner tout l\'historique avec gitleaks', 'Inventorier chaque secret et son propriétaire', 'Remplacer une clé cloud par OIDC', 'Automatiser une rotation', 'Écrire la procédure de fuite'],
    d: 'il ne reste aucun secret en clair et une procédure testée existe.',
  },
  links: [
    ['OWASP Secrets Management', 'https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html', 'doc'],
    ['gitleaks', 'https://github.com/gitleaks/gitleaks', 'repo'],
    ['External Secrets Operator', 'https://external-secrets.io/', 'doc'],
  ],
});

M({
  id: 'a-patterns', name: 'Patterns cloud', stage: 'approches', mono: 'HA', h: 8, sim: 'ha', pre: ['aws'],
  pitch: 'Haute disponibilité et gestion des données : les motifs qui font tenir les systèmes.',
  l: [[
    ['Calculer la disponibilité', `Des composants **en série** se multiplient : deux services à 99,9 % donnent 99,8 %. Des composants **en parallèle** se complètent : deux copies à 99 % donnent 99,99 %.

- 99,9 % : 8 h 46 d'arrêt par an
- 99,99 % : 52 min par an
- 99,999 % : 5 min 15 par an

Le **RTO** est le temps de reprise, le **RPO** la quantité de données que tu acceptes de perdre.`],
  ], [
    ['Motifs de résilience', `- **Retry avec backoff et jitter** : réessayer sans créer de tempête
- **Circuit breaker** : arrêter d'appeler un service en panne
- **Bulkhead** : isoler pour limiter la propagation
- **Queue-based load leveling** : absorber les pics avec une file
- **Health endpoint** : exposer sa santé`, `import random, time

def appel_resilient(f, essais=5, base=0.2):
    for i in range(essais):
        try:
            return f()
        except TimeoutError:
            if i == essais - 1:
                raise
            time.sleep(random.uniform(0, base * 2 ** i))  # full jitter`, 'python'],
  ], [
    ['Gestion des données', `- **Cache-aside** : lire le cache, sinon la base, puis remplir
- **CQRS** : séparer lecture et écriture
- **Event sourcing** : stocker les événements plutôt que l'état
- **Sharding** : partitionner les données
- **Saga** : enchaîner des transactions locales avec compensations

Le **théorème CAP** rappelle qu'en cas de coupure réseau, il faut choisir entre cohérence et disponibilité. Une sauvegarde n'existe que si sa restauration a été testée.`],
    ['Reprise après sinistre', `Quatre niveaux, du moins cher au plus rapide :

- **Sauvegarde et restauration** : RTO en heures
- **Pilot light** : données répliquées, calcul à démarrer
- **Warm standby** : version réduite prête
- **Actif-actif** : RTO proche de zéro, le plus complexe

Le **chaos engineering** vérifie tout cela volontairement : on injecte une panne pour tester une hypothèse.`, `# Exemple avec Chaos Mesh
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata: { name: tuer-api, namespace: boutique }
spec:
  action: pod-kill
  mode: one
  selector: { labelSelectors: { app: api } }`, 'yaml'],
  ]],
  quiz: [
    ['Deux services à 99,9 % en série donnent environ ?', ['99,8 %', '99,99 %', '100 %', '90 %'], 0, '0,999 × 0,999 ≈ 0,998.'],
    ['Pourquoi ajouter du jitter ?', ['Pour éviter que tous les clients réessaient ensemble', 'Pour chiffrer', 'Pour réduire le code', 'Pour la décoration'], 0, 'Sinon, les tentatives créent une vague synchronisée.'],
    ['Que mesure le RPO ?', ['Les données qu\'on accepte de perdre', 'La durée de reprise', 'Le prix', 'La latence'], 0, 'Le RTO mesure le temps de reprise.'],
    ['Quel motif gère une transaction entre services ?', ['Saga', 'Bulkhead', 'Sidecar', 'Cache-aside'], 0, 'Chaque étape a sa compensation.'],
    ['Quelle stratégie donne le RTO le plus court ?', ['Actif-actif', 'Sauvegarde et restauration', 'Pilot light', 'Warm standby'], 0, 'C\'est aussi la plus coûteuse.'],
  ],
  project: {
    t: 'Journée de chaos',
    b: 'Organise un game day sur ton application.',
    s: ['Définir RTO et RPO cibles', 'Écrire des hypothèses de panne', 'Injecter panne de pod, de nœud et de base', 'Restaurer une sauvegarde chronométrée', 'Écrire un rapport avec actions'],
    d: 'les durées mesurées respectent les objectifs ou donnent lieu à un plan d\'action.',
  },
  links: [
    ['Azure Cloud Design Patterns', 'https://learn.microsoft.com/fr-fr/azure/architecture/patterns/', 'doc'],
    ['AWS Disaster Recovery', 'https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html', 'doc'],
    ['Principles of Chaos', 'https://principlesofchaos.org/', 'doc'],
    ['Chaos Mesh', 'https://chaos-mesh.org/docs/', 'doc'],
    ['Designing Data-Intensive Applications', 'https://dataintensive.net/', 'book'],
    ['Exponential Backoff And Jitter', 'https://aws.amazon.com/fr/blogs/architecture/exponential-backoff-and-jitter/', 'blog'],
  ],
});
