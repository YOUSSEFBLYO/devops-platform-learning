U({
  t: 'Du commit à la production', level: 'Intermédiaire', h: 40,
  pitch: 'Une application réelle, conteneurisée, déployée automatiquement sur une infrastructure créée en code.',
  brief: `Tu construis la chaîne complète d'un produit : une API, son frontend et sa base, livrés par un simple \`git push\`.

Ce projet rassemble les fondations du parcours. Si tu ne dois en faire qu'un, fais celui-ci : il constitue une très bonne pièce de portfolio.`,
  arch: ['Git', 'GitHub Actions', 'Tests et scan', 'Registre', 'Terraform', 'Kubernetes', 'Nginx', 'PostgreSQL'],
  tech: ['linux', 'git', 'github', 'docker', 'gha', 'terraform', 'aws', 'k8s', 'helm', 'nginx', 'python', 'bash'],
  ms: [
    ['Application', ['Choisir ou écrire une API avec une base PostgreSQL', 'Écrire des tests unitaires et d\'intégration', 'Écrire des Dockerfiles multi-stage en non-root', 'Faire tourner le tout avec Docker Compose']],
    ['Infrastructure', ['Créer VPC, cluster et base avec Terraform', 'Stocker le state dans un backend distant verrouillé', 'Séparer `staging` et `prod`']],
    ['Pipeline', ['Lancer lint, tests et scan à chaque PR', 'Publier une image taguée par SHA', 'Déployer sur staging avec Helm', 'Déployer en production après validation, avec OIDC']],
    ['Mise en production', ['Exposer en HTTPS avec un domaine', 'Ajouter sondes, ressources et autoscaling', 'Tester une mise à jour et un rollback sans coupure']],
  ],
  done: ['Un `git push` arrive en production sans action manuelle hors validation', 'Aucune clé cloud n\'est stockée dans le dépôt ni dans la CI', 'Une boucle `curl` ne voit aucune erreur pendant un déploiement', '`terraform destroy` puis `apply` redonnent le même environnement'],
  cost: 'Environ 3 à 8 € si tu détruis tout après chaque session. Gratuit en local avec kind à la place d\'EKS.',
  links: [['Online Boutique, application de démo', 'https://github.com/GoogleCloudPlatform/microservices-demo', 'repo'], ['Module EKS Terraform', 'https://registry.terraform.io/modules/terraform-aws-modules/eks/aws/latest', 'doc'], ['Sécuriser le déploiement par OIDC', 'https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/about-security-hardening-with-openid-connect', 'doc']],
});

U({
  t: 'Plateforme GitOps interne', level: 'Avancé', h: 50,
  pitch: 'Une plateforme en libre-service où chaque équipe déploie en toute autonomie, avec des garde-fous.',
  brief: `Tu passes du rôle de celui qui déploie à celui qui construit l'outil de déploiement. Une équipe fictive doit pouvoir créer un service en ajoutant quelques lignes dans Git.

Le cluster se reconstruit entièrement à partir du dépôt.`,
  arch: ['Dépôt deploy', 'Argo CD', 'ApplicationSet', 'Kustomize et Helm', 'Harbor', 'Sealed Secrets', 'Kyverno', 'Namespaces par équipe'],
  tech: ['argocd', 'fluxcd', 'helm', 'k8s', 'harbor', 'sealed', 'vault', 'gitlabci', 'a-gitops', 'a-secrets', 'terraform'],
  ms: [
    ['Socle', ['Créer un cluster avec Terraform ou kind', 'Installer Argo CD avec le motif « app of apps »', 'Installer ingress, cert-manager et Harbor par GitOps']],
    ['Libre-service', ['Créer un ApplicationSet par dossier d\'équipe', 'Écrire un chart Helm standard pour un service', 'Attribuer un namespace, un quota et des droits RBAC à chaque équipe', 'Documenter l\'ajout d\'un service en moins de 10 lignes']],
    ['Garde-fous', ['Refuser les images non signées avec Kyverno', 'Imposer ressources et non-root', 'Chiffrer les secrets dans Git', 'Isoler les équipes avec des NetworkPolicies']],
    ['Promotion', ['Promouvoir dev, staging et prod par pull request', 'Ajouter un canari avec Argo Rollouts', 'Recréer le cluster de zéro depuis Git']],
  ],
  done: ['Un nouveau service se déploie sans intervention de l\'équipe plateforme', 'Une image non signée ou sans limites est refusée', 'Une modification manuelle est annulée automatiquement', 'Le cluster se reconstruit en moins de 30 minutes'],
  cost: 'Gratuit sur un cluster local. Prévois 16 Go de RAM.',
  links: [['Platform Engineering', 'https://platformengineering.org/blog/what-is-platform-engineering', 'blog'], ['Backstage, portail développeur', 'https://backstage.io/docs/overview/what-is-backstage', 'doc'], ['Motif app of apps', 'https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-bootstrapping/', 'doc'], ['Kyverno', 'https://kyverno.io/docs/', 'doc']],
});

U({
  t: 'Observabilité totale et astreinte', level: 'Avancé', h: 40,
  pitch: 'Métriques, logs et traces reliés entre eux, des SLO, une vraie astreinte et un incident simulé.',
  brief: `Une application en microservices tourne, mais personne ne sait vraiment comment elle va. Tu installes l'observabilité, tu définis ce que veut dire « aller bien », puis tu provoques un incident.

Le livrable le plus important n'est pas un tableau de bord : c'est le temps que tu mets à trouver la cause.`,
  arch: ['Microservices', 'OpenTelemetry', 'Collector', 'Prometheus', 'Loki', 'Jaeger', 'Grafana', 'Alertmanager'],
  tech: ['otel', 'prometheus', 'grafana', 'loki', 'jaeger', 'k8s', 'a-observabilite', 'go'],
  ms: [
    ['Collecte', ['Déployer la démo OpenTelemetry ou tes services', 'Faire passer tous les signaux par le Collector', 'Installer Prometheus, Loki et Jaeger ou Tempo']],
    ['Corrélation', ['Ajouter `trace_id` dans chaque log', 'Relier métriques, logs et traces dans Grafana', 'Créer un tableau RED par service']],
    ['Fiabilité', ['Définir deux SLO sur des parcours critiques', 'Générer les alertes burn rate', 'Écrire un runbook par alerte']],
    ['Incident', ['Injecter une panne avec Chaos Mesh sans prévenir l\'équipe', 'Chronométrer détection et diagnostic', 'Écrire un post-mortem sans blâme']],
  ],
  done: ['Le passage de l\'alerte à la trace fautive prend moins de 5 minutes', 'Chaque alerte renvoie à un runbook', 'Aucune alerte ne se déclenche sans action possible', 'Le post-mortem produit des actions datées et attribuées'],
  cost: 'Gratuit en local. Prévois 16 Go de RAM.',
  links: [['Démo OpenTelemetry', 'https://opentelemetry.io/docs/demo/', 'lab'], ['Modèle de post-mortem', 'https://sre.google/sre-book/example-postmortem/', 'doc'], ['Sloth', 'https://sloth.dev/', 'doc'], ['Chaos Mesh', 'https://chaos-mesh.org/docs/', 'doc']],
});

U({
  t: 'Multi-région résiliente', level: 'Expert', h: 60,
  pitch: 'Une application qui survit à la perte d\'une région complète, avec des chiffres pour le prouver.',
  brief: `Tu conçois pour la panne : deux régions, des données répliquées et une bascule testée. Tu pars d'objectifs chiffrés, puis tu vérifies que l'architecture les respecte.

Chaque choix est écrit dans un ADR, car l'actif-actif coûte très cher : il faut savoir justifier ce niveau.`,
  arch: ['Cloudflare', 'Région A', 'Région B', 'Kubernetes', 'Base répliquée', 'Stockage objet', 'Terraform', 'Chaos'],
  tech: ['aws', 'gcp', 'azure', 'terraform', 'cloudflare', 'k8s', 'haproxy', 'a-patterns', 'a-iac', 'prometheus'],
  ms: [
    ['Conception', ['Définir RTO, RPO et budget', 'Calculer la disponibilité théorique', 'Choisir warm standby ou actif-actif dans un ADR']],
    ['Construction', ['Déployer deux régions avec les mêmes modules Terraform', 'Répliquer base et stockage objet', 'Mettre en place DNS ou répartiteur mondial avec health checks', 'Répliquer les images du registre']],
    ['Données', ['Automatiser les sauvegardes vers une troisième zone', 'Restaurer une sauvegarde chronométrée', 'Mesurer le retard de réplication']],
    ['Preuve', ['Simuler la perte complète d\'une région', 'Mesurer RTO et RPO réels', 'Exécuter le retour vers la région principale', 'Calculer le coût mensuel réel']],
  ],
  done: ['La perte d\'une région respecte le RTO et le RPO annoncés', 'La bascule suit un runbook exécutable par une autre personne', 'Une sauvegarde a été réellement restaurée', 'Le surcoût par rapport à une seule région est chiffré'],
  cost: 'Environ 20 à 60 € selon la durée. Détruis tout après chaque test, et crée une alerte de budget avant de commencer.',
  links: [['Reprise après sinistre sur AWS', 'https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html', 'doc'], ['Azure Well-Architected, fiabilité', 'https://learn.microsoft.com/fr-fr/azure/well-architected/reliability/', 'doc'], ['Velero, sauvegarde Kubernetes', 'https://velero.io/docs/', 'doc'], ['CloudNativePG', 'https://cloudnative-pg.io/docs/', 'doc']],
});

U({
  t: 'Zero trust et chaîne logicielle', level: 'Expert', h: 50,
  pitch: 'Chaque image signée, chaque appel authentifié, chaque secret éphémère.',
  brief: `Une attaque récente de la chaîne logicielle fait réagir ta direction. Il faut prouver l'origine de ce qui tourne et limiter les dégâts si un service est compromis.

Tu termines par un exercice : joue l'attaquant dans ton propre environnement de test et montre ce qui est bloqué.`,
  arch: ['Commit signé', 'Build attesté', 'SBOM et scan', 'Signature Cosign', 'Harbor', 'Admission Kyverno', 'Istio mTLS', 'Vault'],
  tech: ['istio', 'envoy', 'vault', 'harbor', 'artifactory', 'gha', 'k8s', 'docker', 'a-secrets', 'a-mesh', 'a-conteneurs'],
  ms: [
    ['Chaîne logicielle', ['Signer les commits et exiger la revue', 'Générer un SBOM et une attestation à chaque build', 'Bloquer les failles critiques en CI', 'Signer les images avec Cosign']],
    ['Admission', ['Refuser les images non signées ou non issues du registre', 'Imposer les Pod Security Standards en `restricted`', 'Bloquer les tags `latest`']],
    ['Réseau et identité', ['Activer le mTLS strict avec Istio', 'Écrire des AuthorizationPolicy par service', 'Limiter les sorties réseau']],
    ['Secrets et preuve', ['Utiliser des identifiants de base dynamiques avec Vault', 'Activer l\'audit Kubernetes et Vault', 'Mener un exercice d\'attaque dans ton lab', 'Rédiger la synthèse de ce qui a été bloqué et détecté']],
  ],
  done: ['Une image non signée ne peut pas démarrer', 'Un pod compromis ne peut joindre que les services autorisés', 'Aucun secret statique ne subsiste', 'Tu peux prouver l\'origine de chaque image en production'],
  cost: 'Gratuit sur un cluster local.',
  links: [['SLSA', 'https://slsa.dev/', 'doc'], ['Sigstore', 'https://docs.sigstore.dev/', 'doc'], ['CIS Benchmarks', 'https://www.cisecurity.org/cis-benchmarks', 'doc'], ['Kubernetes Goat, lab de sécurité', 'https://madhuakula.com/kubernetes-goat/', 'lab'], ['OWASP Top 10 CI/CD', 'https://owasp.org/www-project-top-10-ci-cd-security-risks/', 'doc']],
});
