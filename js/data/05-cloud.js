M({
  id: 'aws', name: 'AWS', stage: 'cloud', mono: 'AWS', h: 40, sim: 'ha', pre: ['linux'],
  pitch: 'Le plus grand cloud public : calcul, stockage, réseau et centaines de services managés.',
  l: [[
    ['Comptes, régions, IAM', `AWS est découpé en **régions**, elles-mêmes composées de **zones de disponibilité** (AZ) indépendantes. **IAM** contrôle qui peut faire quoi. Les utilisateurs humains passent par IAM Identity Center et les applications par des **rôles**, jamais par des clés stockées.`, `aws configure sso
aws sts get-caller-identity

aws s3 mb s3://boutique-demo-1234
aws s3 cp index.html s3://boutique-demo-1234/
aws ec2 describe-instances --query 'Reservations[].Instances[].InstanceId'`, 'bash', 'Active MFA sur le compte root, puis n\'utilise plus jamais ce compte au quotidien. Crée une alerte de budget dès le premier jour.'],
    ['Les services essentiels', `Commence par ceux-ci :

- **EC2** : des machines virtuelles
- **S3** : du stockage d'objets
- **VPC** : ton réseau privé
- **RDS** : des bases de données managées
- **Lambda** : des fonctions
- **CloudWatch** : les métriques et les logs`, `aws ec2 run-instances \\
  --image-id resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \\
  --instance-type t3.micro \\
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=web}]'`, 'bash'],
  ], [
    ['Réseau VPC', `Un **VPC** se divise en sous-réseaux publics (avec route vers une Internet Gateway) et privés (sortie par NAT Gateway). Les **Security Groups** filtrent par ressource et sont stateful. Le schéma classique : ALB en public, applications et bases en privé, sur au moins deux AZ.`, `# Autoriser seulement l'ALB à joindre l'application
aws ec2 authorize-security-group-ingress \\
  --group-id sg-app \\
  --protocol tcp --port 8080 \\
  --source-group sg-alb`, 'bash', 'Une NAT Gateway coûte cher au volume de données. Pour S3 et DynamoDB, utilise des VPC Endpoints de type Gateway, gratuits.'],
    ['Politiques IAM et moindre privilège', `Une politique dit : qui, quelle action, sur quelle ressource, sous quelle condition. Commence avec très peu de droits. **IAM Access Analyzer** t'aide à restreindre à partir de l'usage réel.`, `{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:PutObject"],
    "Resource": "arn:aws:s3:::boutique-assets/*",
    "Condition": { "Bool": { "aws:SecureTransport": "true" } }
  }]
}`, 'json'],
  ], [
    ['Multi-comptes et Well-Architected', `En entreprise, on sépare les environnements en **comptes** sous **AWS Organizations** : la limite de sécurité et de facturation la plus nette. Les **SCP** imposent des interdictions globales et **Control Tower** automatise cette zone d'accueil.

Le **Well-Architected Framework** évalue six piliers : excellence opérationnelle, sécurité, fiabilité, performance, coûts et durabilité.`, `{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "RegionsEuropeUniquement",
    "Effect": "Deny",
    "NotAction": ["iam:*", "organizations:*", "sts:*", "route53:*"],
    "Resource": "*",
    "Condition": { "StringNotEquals": { "aws:RequestedRegion": ["eu-west-3", "eu-west-1"] } }
  }]
}`, 'json'],
    ['Coûts et résilience', `Le FinOps fait partie du métier : **Savings Plans** pour la charge stable, **Spot** pour les tâches interruptibles, Graviton pour un meilleur rapport prix/performance, étiquettes obligatoires pour attribuer les coûts.

Pour la résilience, définis le **RTO** et le **RPO**, puis choisis entre sauvegarde, pilot light, warm standby ou actif-actif. Teste avec **AWS Fault Injection Service**.`, `aws ce get-cost-and-usage \\
  --time-period Start=2026-10-01,End=2026-11-01 \\
  --granularity MONTHLY --metrics UnblendedCost \\
  --group-by Type=DIMENSION,Key=SERVICE \\
  --query 'ResultsByTime[0].Groups[?Metrics.UnblendedCost.Amount>\`10\`]'`, 'bash'],
  ]],
  lab: {
    ctx: 'Publie un site statique avec la CLI AWS, puis vérifie les droits et les coûts.',
    real: ['AWS Skill Builder', 'https://skillbuilder.aws/'],
    prompt: 'ops@laptop:~/site$',
    steps: [
      ['Vérifie ton identité.', '^aws sts get-caller-identity', 'aws sts get-caller-identity', '{ "Account": "123456789012", "Arn": "arn:aws:sts::123456789012:assumed-role/ops/alice" }'],
      ['Crée le bucket `boutique-site-demo` en `eu-west-3`.', '^aws s3 mb s3://boutique-site-demo.*|^aws s3api create-bucket .*boutique-site-demo', 'aws s3 mb s3://boutique-site-demo --region eu-west-3', 'make_bucket: boutique-site-demo'],
      ['Synchronise le dossier `dist` vers le bucket.', '^aws s3 sync \\.?/?dist/? s3://boutique-site-demo', 'aws s3 sync dist s3://boutique-site-demo', 'upload: dist/index.html to s3://boutique-site-demo/index.html\nupload: dist/app.js to s3://boutique-site-demo/app.js'],
      ['Bloque l\'accès public du bucket : le site passera par CloudFront.', '^aws s3api put-public-access-block .*boutique-site-demo', 'aws s3api put-public-access-block --bucket boutique-site-demo --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true', ''],
      ['Invalide le cache de la distribution `E2ABC` pour tous les chemins.', '^aws cloudfront create-invalidation .*E2ABC.*', 'aws cloudfront create-invalidation --distribution-id E2ABC --paths "/*"', '{ "Invalidation": { "Status": "InProgress" } }'],
    ],
  },
  quiz: [
    ['Une application sur EC2 a besoin d\'accéder à S3. Que faire ?', ['Lui attacher un rôle IAM', 'Écrire une clé dans le code', 'Rendre le bucket public', 'Utiliser le compte root'], 0, 'Le rôle fournit des identifiants temporaires.'],
    ['Quelle est la différence entre région et AZ ?', ['Une région contient plusieurs AZ isolées', 'C\'est la même chose', 'Une AZ contient des régions', 'Une AZ est un compte'], 0, 'Répartir sur plusieurs AZ protège d\'une panne locale.'],
    ['Quel achat convient à une charge stable ?', ['Savings Plan', 'Spot', 'Dedicated Host obligatoire', 'Aucun'], 0, 'Spot convient aux tâches interruptibles.'],
    ['Comment imposer une règle à tous les comptes ?', ['Avec une SCP', 'Avec une clé SSH', 'Avec un tag', 'Avec S3'], 0, 'Elle fixe le maximum autorisé, même pour un administrateur.'],
    ['Quel est le rôle d\'un Security Group ?', ['Filtrer le trafic d\'une ressource, de façon stateful', 'Gérer les factures', 'Stocker des logs', 'Répartir la charge'], 0, 'La réponse à un flux autorisé passe automatiquement.'],
  ],
  project: {
    t: 'Application web sur deux zones',
    b: 'Construis à la main, puis documente, une architecture classique. Elle sera reprise en Terraform plus loin.',
    s: ['Créer un budget avec alerte et activer MFA', 'Créer un VPC avec sous-réseaux publics et privés sur deux AZ', 'Déployer un groupe d\'autoscaling derrière un ALB', 'Ajouter une base RDS Multi-AZ en privé', 'Servir les fichiers statiques avec S3 et CloudFront', 'Centraliser logs et alarmes dans CloudWatch', 'Tout supprimer et vérifier la facture'],
    d: 'l\'arrêt forcé d\'une instance et un basculement RDS ne provoquent qu\'une brève interruption.',
    x: 'Passe l\'architecture à l\'épreuve avec AWS Fault Injection Service.',
  },
  links: [
    ['Documentation AWS', 'https://docs.aws.amazon.com/', 'doc'],
    ['AWS Skill Builder', 'https://skillbuilder.aws/', 'cours'],
    ['Well-Architected Framework', 'https://aws.amazon.com/fr/architecture/well-architected/', 'doc'],
    ['Offre gratuite AWS', 'https://aws.amazon.com/fr/free/', 'doc'],
    ['Roadmap AWS', 'https://roadmap.sh/aws', 'cours'],
    ['Open Guide to AWS', 'https://github.com/open-guides/og-aws', 'repo'],
  ],
});

M({
  id: 'azure', name: 'Azure', stage: 'cloud', mono: 'Az', h: 28, sim: 'ha', pre: ['linux'],
  pitch: 'Le cloud de Microsoft, incontournable dans les entreprises déjà équipées de son écosystème.',
  l: [[
    ['Abonnements et groupes de ressources', `Azure suit une hiérarchie : **tenant** Entra ID, **management groups**, **abonnements**, **groupes de ressources**, ressources. Un groupe de ressources rassemble ce qui vit et meurt ensemble.`, `az login
az account show
az group create -n rg-boutique-dev -l francecentral
az vm create -g rg-boutique-dev -n web --image Ubuntu2404 \\
  --size Standard_B1s --generate-ssh-keys
az group delete -n rg-boutique-dev --yes   # tout supprimer d'un coup`, 'bash'],
  ], [
    ['Réseau, identité et conteneurs', `**VNet** et **NSG** sont les équivalents du VPC et des security groups. **Entra ID** gère les identités et les **Managed Identities** donnent une identité aux applications sans mot de passe. **AKS** propose Kubernetes et **Container Apps** du conteneur serverless.`, `az aks create -g rg-boutique -n aks-boutique \\
  --node-count 3 --zones 1 2 3 \\
  --enable-managed-identity --enable-oidc-issuer --enable-workload-identity
az aks get-credentials -g rg-boutique -n aks-boutique

# Donner à une identité l'accès à Key Vault
az role assignment create --assignee $APP_ID \\
  --role "Key Vault Secrets User" --scope $KV_ID`, 'bash'],
  ], [
    ['Gouvernance et Landing Zones', `**Azure Policy** impose des règles à grande échelle, par exemple refuser tout déploiement hors d'Europe. Les **Landing Zones** organisent les abonnements. **Bicep** est le langage IaC natif de Microsoft, et **Defender for Cloud** évalue la sécurité.`, `resource sa 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: 'stboutique\${uniqueString(resourceGroup().id)}'
  location: resourceGroup().location
  sku: { name: 'Standard_ZRS' }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
  }
}
// az deployment group create -g rg-boutique -f main.bicep --what-if`, 'bicep'],
  ]],
  lab: {
    ctx: 'Crée un environnement éphémère avec la CLI Azure.',
    real: ['Microsoft Learn, AZ-104', 'https://learn.microsoft.com/fr-fr/credentials/certifications/azure-administrator/'],
    prompt: 'ops@laptop:~$',
    steps: [
      ['Crée le groupe `rg-demo` en `francecentral`.', '^az group create .*rg-demo.*francecentral|^az group create .*francecentral.*rg-demo', 'az group create -n rg-demo -l francecentral', '{ "name": "rg-demo", "properties": { "provisioningState": "Succeeded" } }'],
      ['Crée un compte de stockage `stdemo1234` dans ce groupe.', '^az storage account create .*stdemo1234', 'az storage account create -n stdemo1234 -g rg-demo --sku Standard_LRS', '"provisioningState": "Succeeded"'],
      ['Liste les ressources du groupe sous forme de tableau.', '^az resource list .*rg-demo.*(-o|--output) table', 'az resource list -g rg-demo -o table', 'Name        ResourceGroup  Location       Type\nstdemo1234  rg-demo        francecentral  Microsoft.Storage/storageAccounts'],
      ['Supprime tout le groupe sans attendre.', '^az group delete .*rg-demo', 'az group delete -n rg-demo --yes --no-wait', ''],
    ],
  },
  quiz: [
    ['Que regroupe un groupe de ressources ?', ['Des ressources au cycle de vie commun', 'Des utilisateurs', 'Des régions', 'Des factures'], 0, 'Le supprimer efface tout son contenu.'],
    ['Comment donner une identité à une application sans secret ?', ['Avec une Managed Identity', 'Avec un mot de passe en clair', 'Avec une clé SSH partagée', 'Avec un compte administrateur'], 0, 'Azure gère les identifiants pour toi.'],
    ['Quel service impose des règles à grande échelle ?', ['Azure Policy', 'Azure DNS', 'Blob Storage', 'Logic Apps'], 0, 'Il peut refuser, auditer ou corriger.'],
    ['Quel est le langage IaC natif ?', ['Bicep', 'HCL', 'Jsonnet', 'Rego'], 0, 'Il se compile en templates ARM.'],
  ],
  project: {
    t: 'API sur AKS avec Key Vault',
    b: 'Déploie une API qui lit ses secrets sans en stocker. Pense à supprimer le groupe après chaque session.',
    s: ['Écrire l\'infrastructure en Bicep', 'Créer AKS sur trois zones', 'Stocker un secret dans Key Vault', 'Lire ce secret avec Workload Identity', 'Superviser avec Azure Monitor', 'Ajouter une Azure Policy qui refuse les ressources sans tag'],
    d: 'aucun secret n\'existe dans le dépôt et une ressource sans tag est refusée au déploiement.',
  },
  links: [
    ['Documentation Azure', 'https://learn.microsoft.com/fr-fr/azure/', 'doc'],
    ['Parcours Microsoft Learn', 'https://learn.microsoft.com/fr-fr/training/azure/', 'cours'],
    ['Azure Architecture Center', 'https://learn.microsoft.com/fr-fr/azure/architecture/', 'doc'],
    ['Bicep', 'https://learn.microsoft.com/fr-fr/azure/azure-resource-manager/bicep/', 'doc'],
  ],
});

M({
  id: 'gcp', name: 'Google Cloud', stage: 'cloud', icon: 'googlecloud', h: 24, sim: 'ha', pre: ['linux'],
  pitch: 'Le cloud né chez Google, fort sur Kubernetes, les données et le réseau mondial.',
  l: [[
    ['Projets et gcloud', `Sur Google Cloud, tout appartient à un **projet**. Les projets s'organisent en dossiers sous une organisation. \`gcloud\` pilote l'ensemble et **Cloud Shell** offre un terminal gratuit dans le navigateur.`, `gcloud auth login
gcloud config set project boutique-demo
gcloud config set compute/region europe-west9
gcloud services enable run.googleapis.com
gcloud compute instances list
gcloud storage ls`, 'bash'],
  ], [
    ['Cloud Run et GKE', `**Cloud Run** exécute un conteneur à la demande et descend à zéro. **GKE** est un Kubernetes managé réputé, en particulier en mode **Autopilot**, où Google gère les nœuds. Le réseau **VPC est mondial** : un seul VPC couvre plusieurs régions.`, `gcloud run deploy api \\
  --source . --region europe-west9 \\
  --allow-unauthenticated --max-instances 10

gcloud container clusters create-auto boutique --region europe-west9
gcloud container clusters get-credentials boutique --region europe-west9`, 'bash'],
  ], [
    ['Identité et sécurité', `L'**IAM** attribue des rôles à des comptes de service. **Workload Identity Federation** permet à GitHub ou GitLab d'agir sans clé JSON téléchargée. Les **Organization Policies** posent les garde-fous et **VPC Service Controls** évite l'exfiltration de données.`, `gcloud iam workload-identity-pools create github --location=global
gcloud iam workload-identity-pools providers create-oidc gh \\
  --location=global --workload-identity-pool=github \\
  --issuer-uri=https://token.actions.githubusercontent.com \\
  --attribute-mapping=google.subject=assertion.sub,attribute.repository=assertion.repository \\
  --attribute-condition="assertion.repository=='acme/boutique'"`, 'bash', 'Une clé JSON de compte de service est un secret de longue durée. Évite d\'en créer : préfère la fédération d\'identité.'],
  ]],
  lab: {
    ctx: 'Déploie une API sur Cloud Run à partir d\'un Dockerfile.',
    real: ['Google Cloud Skills Boost', 'https://www.skills.google/'],
    prompt: 'ops@cloudshell:~/api$',
    steps: [
      ['Sélectionne le projet `boutique-demo`.', '^gcloud config set (core/)?project boutique-demo', 'gcloud config set project boutique-demo', 'Updated property [core/project].'],
      ['Active l\'API Cloud Run.', '^gcloud services enable run\\.googleapis\\.com', 'gcloud services enable run.googleapis.com', 'Operation finished successfully.'],
      ['Déploie le service `api` depuis les sources, région `europe-west9`.', '^gcloud run deploy api .*--source', 'gcloud run deploy api --source . --region europe-west9', 'Service [api] revision [api-00001] has been deployed.\nService URL: https://api-xyz-od.a.run.app'],
      ['Envoie 10 % du trafic vers la dernière révision.', '^gcloud run services update-traffic api .*--to-latest|^gcloud run services update-traffic api .*--to-revisions', 'gcloud run services update-traffic api --to-revisions LATEST=10', 'Traffic: 90% api-00001, 10% LATEST'],
    ],
  },
  quiz: [
    ['À quel niveau se font la facturation et l\'isolation des ressources ?', ['Le projet', 'La VM', 'Le bucket', 'La clé'], 0, 'Chaque ressource appartient à un projet.'],
    ['Que propose GKE Autopilot ?', ['La gestion des nœuds par Google', 'Un mode sans réseau', 'Le passage à Windows', 'La suppression d\'IAM'], 0, 'Tu paies pour les pods, pas pour les nœuds.'],
    ['Quel service exécute un conteneur et descend à zéro ?', ['Cloud Run', 'Compute Engine', 'Cloud SQL', 'Cloud Storage'], 0, 'Il facture pendant le traitement des requêtes.'],
    ['Comment déployer depuis GitHub sans clé JSON ?', ['Avec Workload Identity Federation', 'En copiant la clé', 'Avec un mot de passe', 'Avec FTP'], 0, 'GitHub présente un jeton OIDC à durée limitée.'],
  ],
  project: {
    t: 'Service mondial sur Cloud Run',
    b: 'Publie une API dans deux régions derrière un même point d\'entrée.',
    s: ['Déployer sur Cloud Run dans deux régions', 'Placer un Global Load Balancer devant', 'Ajouter Cloud SQL ou Firestore', 'Déployer depuis GitHub Actions avec la fédération d\'identité', 'Créer une alerte sur le taux d\'erreur'],
    d: 'un déploiement part d\'un push sans clé stockée et la perte d\'une région ne coupe pas le service.',
  },
  links: [
    ['Documentation Google Cloud', 'https://cloud.google.com/docs?hl=fr', 'doc'],
    ['Google Cloud Skills Boost', 'https://www.skills.google/', 'cours'],
    ['Architecture Center', 'https://cloud.google.com/architecture?hl=fr', 'doc'],
    ['Comparaison des services cloud', 'https://cloud.google.com/docs/get-started/aws-azure-gcp-service-comparison?hl=fr', 'doc'],
  ],
});
