M({
  id: 'terraform', name: 'Terraform', stage: 'iac', icon: 'terraform', h: 24, sim: 'tfplan', simCfg: { tool: 'terraform' }, pre: ['aws'],
  pitch: 'Décrire l\'infrastructure dans du code, la relire et l\'appliquer de façon reproductible.',
  l: [[
    ['Le cycle init, plan, apply', `Tu écris ce que tu veux en **HCL**. Terraform compare ce code avec son **state** (ce qu'il a déjà créé) puis calcule un **plan**. Rien ne change avant \`apply\`.

Le projet open source **OpenTofu** propose le même langage et les mêmes commandes sous licence libre.`, `terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}
provider "aws" { region = "eu-west-3" }

resource "aws_s3_bucket" "assets" {
  bucket = "boutique-assets-demo"
}

output "bucket_arn" { value = aws_s3_bucket.assets.arn }
# terraform init && terraform plan && terraform apply`, 'hcl', 'Lis toujours le plan. Une seule ligne `-/+` peut vouloir dire que ta base de données sera recréée.'],
    ['Variables et références', `Les **variables** paramètrent le code. Une ressource en référence une autre avec \`type.nom.attribut\`, et Terraform en déduit l'ordre de création. \`for_each\` crée plusieurs ressources à partir d'une liste.`, `variable "env" {
  type = string
  validation {
    condition     = contains(["dev", "prod"], var.env)
    error_message = "env doit valoir dev ou prod."
  }
}
locals { zones = ["eu-west-3a", "eu-west-3b"] }

resource "aws_subnet" "prive" {
  for_each          = toset(local.zones)
  vpc_id            = aws_vpc.main.id
  availability_zone = each.key
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, index(local.zones, each.key))
  tags              = { Name = "\${var.env}-\${each.key}" }
}`, 'hcl'],
  ], [
    ['State distant et verrouillage', `Le state contient parfois des secrets et doit être partagé par l'équipe. On le stocke dans un backend distant, chiffré et verrouillé, pour éviter deux \`apply\` simultanés. Le fichier \`.terraform.lock.hcl\` fige les versions des providers.`, `terraform {
  backend "s3" {
    bucket       = "acme-tfstate"
    key          = "boutique/prod/terraform.tfstate"
    region       = "eu-west-3"
    encrypt      = true
    use_lockfile = true
  }
}

# Inspecter et réparer
# terraform state list
# terraform import aws_s3_bucket.assets boutique-assets-demo
# terraform plan -refresh-only`, 'hcl', 'Ne committe jamais `terraform.tfstate` et ne le modifie jamais à la main. Utilise `terraform state mv` ou les blocs `moved`.'],
    ['Modules réutilisables', `Un **module** est un dossier de code Terraform avec des entrées et des sorties. Il encapsule une brique standard. Publie-le avec une version et consomme-le depuis chaque environnement.`, `module "reseau" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name            = "boutique-\${var.env}"
  cidr            = "10.0.0.0/16"
  azs             = ["eu-west-3a", "eu-west-3b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]
  enable_nat_gateway = true
}

output "subnets" { value = module.reseau.private_subnets }`, 'hcl'],
  ], [
    ['Tests et politiques', `\`terraform test\` valide un module. **tflint** repère les erreurs, **Trivy** ou **Checkov** les mauvaises configurations, **OPA/Conftest** ou **Sentinel** appliquent tes politiques sur le plan. **Infracost** chiffre chaque PR.`, `# tests/s3.tftest.hcl
run "chiffrement_actif" {
  command = plan
  assert {
    condition     = aws_s3_bucket_server_side_encryption_configuration.assets.rule[0].apply_server_side_encryption_by_default[0].sse_algorithm == "aws:kms"
    error_message = "Le bucket doit être chiffré avec KMS."
  }
}

# En CI
# terraform fmt -check && terraform validate && tflint
# trivy config . --severity HIGH,CRITICAL
# terraform test`, 'hcl'],
    ['Exploiter à l\'échelle', `Sépare les states par composant et par environnement pour limiter les dégâts possibles. Les outils comme **Atlantis**, **Terraform Cloud** ou **Spacelift** exécutent \`plan\` en PR et \`apply\` après revue. Détecte la dérive avec un plan planifié.

Pour les refactorings, utilise les blocs \`moved\`, \`import\` et \`removed\`, relus comme du code.`, `moved {
  from = aws_instance.web
  to   = module.web.aws_instance.this
}
import {
  to = aws_s3_bucket.logs
  id = "acme-logs-existant"
}
removed {
  from = aws_cloudwatch_log_group.ancien
  lifecycle { destroy = false }
}`, 'hcl'],
  ]],
  lab: {
    ctx: 'Un collègue a créé un bucket à la main. Reprends-le en code, puis déploie un changement.',
    real: ['Tutoriels Terraform officiels', 'https://developer.hashicorp.com/terraform/tutorials'],
    prompt: 'ops@laptop:~/infra$',
    steps: [
      ['Initialise le répertoire.', '^(terraform|tofu) init', 'terraform init', 'Terraform has been successfully initialized!'],
      ['Formate et valide le code.', '^(terraform|tofu) (fmt|validate)', 'terraform validate', 'Success! The configuration is valid.'],
      ['Importe le bucket `acme-logs` dans `aws_s3_bucket.logs`.', '^(terraform|tofu) import aws_s3_bucket\\.logs acme-logs', 'terraform import aws_s3_bucket.logs acme-logs', 'Import successful!'],
      ['Génère un plan et enregistre-le dans `tfplan`.', '^(terraform|tofu) plan .*-out[ =]tfplan', 'terraform plan -out=tfplan', `  ~ aws_s3_bucket.logs
      ~ tags = { "env" = "prod" }

Plan: 0 to add, 1 to change, 0 to destroy.`],
      ['Applique exactement ce plan.', '^(terraform|tofu) apply tfplan', 'terraform apply tfplan', 'Apply complete! Resources: 0 added, 1 changed, 0 destroyed.'],
      ['Liste les ressources du state.', '^(terraform|tofu) state list', 'terraform state list', 'aws_s3_bucket.logs\naws_vpc.main'],
    ],
  },
  quiz: [
    ['À quoi sert le fichier de state ?', ['À relier le code aux ressources réelles', 'À stocker les logs', 'À compiler HCL', 'À gérer Git'], 0, 'C\'est ce qui permet de calculer un plan.'],
    ['Pourquoi verrouiller le state ?', ['Pour éviter deux apply simultanés', 'Pour le rendre public', 'Pour réduire la facture', 'Pour accélérer DNS'], 0, 'Deux écritures simultanées peuvent le corrompre.'],
    ['Que signifie `-/+` dans un plan ?', ['La ressource sera détruite puis recréée', 'Un commentaire', 'Une modification sans impact', 'Aucun changement'], 0, 'Attention aux ressources à données.'],
    ['Quel fichier fige les versions de providers ?', ['`.terraform.lock.hcl`', '`main.tf`', '`variables.tf`', '`.gitignore`'], 0, 'Il doit être committé.'],
    ['Comment renommer une ressource sans la recréer ?', ['Avec un bloc `moved`', 'Avec `terraform destroy`', 'En éditant le state à la main', 'C\'est impossible'], 0, 'Le changement reste relu et versionné.'],
  ],
  project: {
    t: 'Infrastructure AWS complète en code',
    b: 'Reprends l\'architecture du module AWS, mais entièrement en Terraform ou OpenTofu.',
    s: ['Créer un backend S3 chiffré et verrouillé', 'Écrire des modules réseau, calcul et base de données', 'Séparer `dev` et `prod` sans dupliquer le code', 'Ajouter `terraform test`, tflint et Trivy à la CI', 'Publier le plan en commentaire de PR', 'Détruire `dev` puis le recréer en une commande', 'Planifier une détection quotidienne de dérive'],
    d: 'un `terraform destroy` suivi d\'un `apply` redonne un environnement identique.',
    x: 'Ajoute Infracost et bloque une PR qui augmente la facture de plus de 20 %.',
  },
  links: [
    ['Tutoriels HashiCorp', 'https://developer.hashicorp.com/terraform/tutorials', 'cours'],
    ['Registry Terraform', 'https://registry.terraform.io/', 'doc'],
    ['OpenTofu', 'https://opentofu.org/docs/', 'doc'],
    ['Terraform Best Practices', 'https://www.terraform-best-practices.com/', 'book'],
    ['tflint', 'https://github.com/terraform-linters/tflint', 'repo'],
    ['Roadmap Terraform', 'https://roadmap.sh/terraform', 'cours'],
  ],
});

M({
  id: 'pulumi', name: 'Pulumi', stage: 'iac', icon: 'pulumi', h: 10, sim: 'tfplan', simCfg: { tool: 'pulumi' }, pre: ['python'],
  pitch: 'L\'infrastructure as code écrite dans de vrais langages : TypeScript, Python, Go.',
  l: [[
    ['Infrastructure en vrai code', `Pulumi remplace le DSL par un langage que tu connais déjà, avec boucles, fonctions, classes et tests. Un **projet** contient le code, une **stack** est une instance (dev, prod).`, `import pulumi
import pulumi_aws as aws

config = pulumi.Config()
env = pulumi.get_stack()

bucket = aws.s3.BucketV2("assets", tags={"env": env})
pulumi.export("bucket", bucket.id)

# pulumi new aws-python
# pulumi stack init dev
# pulumi up`, 'python'],
  ], [
    ['Composants réutilisables', `Un **ComponentResource** regroupe plusieurs ressources derrière une classe. Les **Outputs** sont des valeurs connues après création, et \`apply\` permet de les transformer. La configuration chiffre les secrets par stack.`, `class SiteStatique(pulumi.ComponentResource):
    def __init__(self, nom, opts=None):
        super().__init__("acme:web:SiteStatique", nom, None, opts)
        self.bucket = aws.s3.BucketV2(nom, opts=pulumi.ResourceOptions(parent=self))
        self.url = self.bucket.bucket_regional_domain_name.apply(lambda d: f"https://{d}")
        self.register_outputs({"url": self.url})

site = SiteStatique("boutique")
pulumi.export("url", site.url)

# pulumi config set --secret dbPassword 'S3cret'`, 'python'],
  ], [
    ['Tests et Automation API', `Puisque c'est du code, tu peux écrire de vrais tests unitaires avec des ressources simulées. L'**Automation API** pilote Pulumi depuis un programme : c'est ainsi qu'on construit une plateforme interne qui crée un environnement à la demande.`, `import pulumi.automation as auto

def creer_env(nom):
    stack = auto.create_or_select_stack(
        stack_name=nom, project_name="envs",
        program=lambda: creer_infra(nom),
    )
    stack.set_config("aws:region", auto.ConfigValue("eu-west-3"))
    resultat = stack.up(on_output=print)
    return resultat.outputs["url"].value`, 'python', 'La puissance d\'un vrai langage a un revers : un code trop abstrait devient impossible à relire. Reste simple, le plan doit rester évident.'],
  ]],
  lab: {
    ctx: 'Crée une stack, prévisualise, déploie, puis nettoie.',
    real: ['Tutoriels Pulumi', 'https://www.pulumi.com/tutorials/'],
    prompt: 'ops@laptop:~/infra$',
    steps: [
      ['Crée un projet à partir du modèle `aws-python`.', '^pulumi new aws-python', 'pulumi new aws-python', 'Your new project is ready to go!'],
      ['Stocke un secret de configuration `dbPassword`.', '^pulumi config set --secret dbPassword', "pulumi config set --secret dbPassword 'S3cret'", ''],
      ['Prévisualise les changements.', '^pulumi preview', 'pulumi preview', 'Resources:\n    + 2 to create'],
      ['Déploie.', '^pulumi up', 'pulumi up --yes', 'Resources:\n    + 2 created\nDuration: 14s'],
      ['Détruis les ressources.', '^pulumi destroy', 'pulumi destroy --yes', 'Resources:\n    - 2 deleted'],
    ],
  },
  quiz: [
    ['Quel est l\'atout principal de Pulumi ?', ['Utiliser de vrais langages de programmation', 'Ne pas gérer de state', 'Ne fonctionner que sur AWS', 'Remplacer Kubernetes'], 0, 'Tu réutilises tests, packages et IDE.'],
    ['Qu\'est-ce qu\'une stack ?', ['Une instance d\'un programme, comme dev ou prod', 'Un conteneur', 'Une VM', 'Un bucket'], 0, 'Chacune a son propre state et sa configuration.'],
    ['Que permet l\'Automation API ?', ['Piloter Pulumi depuis ton propre programme', 'Compiler du Go', 'Gérer le DNS', 'Scanner les images'], 0, 'Idéal pour une plateforme en libre-service.'],
  ],
  project: {
    t: 'Environnements à la demande',
    b: 'Écris une petite API qui crée un environnement de test complet.',
    s: ['Modéliser un composant `AppEnvironment`', 'Écrire des tests unitaires avec mocks', 'Exposer une API `POST /envs` avec l\'Automation API', 'Détruire automatiquement après 24 h', 'Déployer depuis la CI'],
    d: 'un appel HTTP crée un environnement et renvoie son URL, puis il disparaît seul.',
  },
  links: [
    ['Documentation Pulumi', 'https://www.pulumi.com/docs/', 'doc'],
    ['Tutoriels Pulumi', 'https://www.pulumi.com/tutorials/', 'cours'],
    ['Exemples Pulumi', 'https://github.com/pulumi/examples', 'repo'],
    ['Automation API', 'https://www.pulumi.com/docs/iac/automation-api/', 'doc'],
  ],
});

M({
  id: 'cdk', name: 'AWS CDK', stage: 'iac', mono: 'CDK', h: 10, sim: 'tfplan', simCfg: { tool: 'cdk' }, pre: ['aws'],
  pitch: 'Définir de l\'infrastructure AWS en TypeScript ou Python, compilée vers CloudFormation.',
  l: [[
    ['Constructs et stacks', `Tu écris une **App** contenant des **Stacks**, composées de **Constructs**. \`cdk synth\` produit un template CloudFormation, et \`cdk deploy\` le déploie.`, `import { App, Stack, RemovalPolicy } from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";

class BoutiqueStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);
    new s3.Bucket(this, "Assets", {
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.RETAIN,
    });
  }
}
new BoutiqueStack(new App(), "boutique-dev");
// cdk init app --language typescript && cdk bootstrap && cdk deploy`, 'typescript'],
  ], [
    ['Niveaux de constructs', `Il y a trois niveaux : **L1** correspond exactement à CloudFormation, **L2** ajoute des valeurs par défaut sûres et **L3** déploie un motif complet. Quelques lignes L3 créent tout un service avec ALB, Fargate et autoscaling.`, `import * as ecs from "aws-cdk-lib/aws-ecs";
import * as patterns from "aws-cdk-lib/aws-ecs-patterns";

const svc = new patterns.ApplicationLoadBalancedFargateService(this, "Api", {
  cpu: 512,
  memoryLimitMiB: 1024,
  desiredCount: 2,
  taskImageOptions: { image: ecs.ContainerImage.fromAsset("./api") },
});
svc.targetGroup.configureHealthCheck({ path: "/healthz" });
svc.service.autoScaleTaskCount({ maxCapacity: 10 }).scaleOnCpuUtilization("Cpu", { targetUtilizationPercent: 60 });`, 'typescript'],
  ], [
    ['Tests et pipelines', `Les **assertions** vérifient le template généré. **CDK Pipelines** crée un pipeline qui se met à jour lui-même. Les **Aspects** parcourent tous les constructs pour imposer une règle, comme l'outil **cdk-nag** pour la conformité.`, `import { Template } from "aws-cdk-lib/assertions";

test("le bucket est versionné", () => {
  const t = Template.fromStack(new BoutiqueStack(new App(), "test"));
  t.hasResourceProperties("AWS::S3::Bucket", {
    VersioningConfiguration: { Status: "Enabled" },
  });
});

// Aspects.of(app).add(new AwsSolutionsChecks());`, 'typescript'],
  ]],
  lab: {
    ctx: 'Déploie une stack CDK et compare les changements avant de les appliquer.',
    real: ['CDK Workshop', 'https://cdkworkshop.com/'],
    prompt: 'dev@laptop:~/infra$',
    steps: [
      ['Initialise une application TypeScript.', '^cdk init app .*(--language|-l)[ =]typescript', 'cdk init app --language typescript', 'All done!'],
      ['Prépare le compte avec le bootstrap.', '^cdk bootstrap', 'cdk bootstrap', '✅  Environment aws://123456789012/eu-west-3 bootstrapped.'],
      ['Génère le template CloudFormation.', '^cdk synth', 'cdk synth', 'Resources:\n  Assets5C3B8F2A:\n    Type: AWS::S3::Bucket'],
      ['Compare avec ce qui est déployé.', '^cdk diff', 'cdk diff', 'Resources\n[+] AWS::S3::Bucket Assets'],
      ['Déploie.', '^cdk deploy', 'cdk deploy', '✅  boutique-dev'],
    ],
  },
  quiz: [
    ['En quoi le CDK se transforme-t-il ?', ['En templates CloudFormation', 'En Bash', 'En Helm', 'En Docker'], 0, '`cdk synth` affiche le résultat.'],
    ['Qu\'est-ce qu\'un construct L3 ?', ['Un motif complet de plusieurs ressources', 'Une ressource brute', 'Un fichier JSON', 'Un rôle IAM'], 0, 'L1 est brut, L2 ajoute des défauts, L3 assemble.'],
    ['Que fait `cdk bootstrap` ?', ['Il prépare le compte pour le déploiement', 'Il compile Go', 'Il crée un cluster', 'Il supprime la stack'], 0, 'Il crée le bucket et les rôles nécessaires aux assets.'],
  ],
  project: {
    t: 'API conteneurisée avec CDK',
    b: 'Déploie un service Fargate complet avec quelques dizaines de lignes.',
    s: ['Créer le service avec un construct L3', 'Ajouter un autoscaling sur le CPU', 'Ajouter cdk-nag et corriger les alertes', 'Écrire des tests d\'assertions', 'Créer un pipeline CDK'],
    d: 'un push déploie la stack et les tests échouent si le chiffrement est retiré.',
  },
  links: [
    ['Guide AWS CDK', 'https://docs.aws.amazon.com/cdk/v2/guide/home.html', 'doc'],
    ['CDK Workshop', 'https://cdkworkshop.com/', 'lab'],
    ['Construct Hub', 'https://constructs.dev/', 'doc'],
    ['cdk-nag', 'https://github.com/cdklabs/cdk-nag', 'repo'],
  ],
});

M({
  id: 'cfn', name: 'CloudFormation', stage: 'iac', mono: 'CFN', h: 8, sim: 'tfplan', simCfg: { tool: 'aws cloudformation' }, pre: ['aws'],
  pitch: 'Le service d\'IaC natif d\'AWS, avec un état géré pour toi et un retour arrière automatique.',
  l: [[
    ['Templates et stacks', `Un **template** YAML décrit des ressources, et une **stack** en est une instance. AWS conserve l'état et revient en arrière si un déploiement échoue.`, `AWSTemplateFormatVersion: '2010-09-09'
Parameters:
  Env: { Type: String, AllowedValues: [dev, prod] }
Resources:
  Assets:
    Type: AWS::S3::Bucket
    DeletionPolicy: Retain
    Properties:
      BucketName: !Sub 'boutique-\${Env}-\${AWS::AccountId}'
      VersioningConfiguration: { Status: Enabled }
Outputs:
  BucketArn:
    Value: !GetAtt Assets.Arn`, 'yaml'],
  ], [
    ['Change sets et stacks imbriquées', `Un **change set** montre ce qui va changer, comme un plan. Les \`Export\` et \`ImportValue\` partagent des valeurs entre stacks. **Drift detection** détecte les modifications manuelles.`, `aws cloudformation deploy \\
  --template-file template.yaml --stack-name boutique-dev \\
  --parameter-overrides Env=dev --no-execute-changeset

aws cloudformation describe-change-set \\
  --change-set-name <arn> --query 'Changes[].ResourceChange.[Action,LogicalResourceId,Replacement]'

aws cloudformation detect-stack-drift --stack-name boutique-dev`, 'bash'],
  ], [
    ['Politiques et multi-comptes', `Les **Stack Policies** protègent des ressources contre les mises à jour. Les **StackSets** déploient sur tous les comptes d'une organisation. **cfn-lint** et **cfn-guard** valident les templates et leur conformité dans la CI.`, `# guard : tout bucket doit être chiffré
rule s3_chiffre {
  AWS::S3::Bucket {
    Properties.BucketEncryption exists
    Properties.PublicAccessBlockConfiguration.BlockPublicAcls == true
  }
}
# cfn-guard validate -d template.yaml -r regles.guard
# aws cloudformation create-stack-set --stack-set-name securite --permission-model SERVICE_MANAGED --auto-deployment Enabled=true,RetainStacksOnAccountRemoval=false --template-body file://base.yaml`, 'text', 'Une stack bloquée en `UPDATE_ROLLBACK_FAILED` demande `continue-update-rollback`. Ne supprime pas de ressource à la main pendant une mise à jour.'],
  ]],
  lab: {
    ctx: 'Déploie une stack en deux temps, puis vérifie la dérive.',
    real: ['CloudFormation Workshop', 'https://catalog.workshops.aws/cfn101/en-US'],
    prompt: 'ops@laptop:~/infra$',
    steps: [
      ['Valide `template.yaml` avec `cfn-lint`.', '^cfn-lint template\\.yaml', 'cfn-lint template.yaml', ''],
      ['Déploie la stack `boutique-dev` sans exécuter le change set.', '^aws cloudformation deploy .*--no-execute-changeset', 'aws cloudformation deploy --template-file template.yaml --stack-name boutique-dev --no-execute-changeset', 'Changeset created successfully.'],
      ['Déploie réellement.', '^aws cloudformation deploy (?!.*--no-execute-changeset).*boutique-dev', 'aws cloudformation deploy --template-file template.yaml --stack-name boutique-dev', 'Successfully created/updated stack - boutique-dev'],
      ['Lance la détection de dérive.', '^aws cloudformation detect-stack-drift .*boutique-dev', 'aws cloudformation detect-stack-drift --stack-name boutique-dev', '{ "StackDriftDetectionId": "5c2e…" }'],
    ],
  },
  quiz: [
    ['Que se passe-t-il si une mise à jour échoue ?', ['La stack revient automatiquement en arrière', 'Le compte est supprimé', 'Rien ne change jamais', 'Tout reste à moitié appliqué sans alerte'], 0, 'C\'est le comportement par défaut.'],
    ['Qu\'est-ce qu\'un change set ?', ['L\'aperçu des modifications', 'Une clé', 'Une instance', 'Un bucket'], 0, 'L\'équivalent de `terraform plan`.'],
    ['Comment déployer sur tous les comptes ?', ['Avec des StackSets', 'À la main', 'Avec Docker', 'Avec un cron'], 0, 'Ils s\'intègrent à AWS Organizations.'],
  ],
  project: {
    t: 'Socle de compte',
    b: 'Crée les ressources que tout compte devrait avoir.',
    s: ['Écrire un template de sécurité de base : CloudTrail et bucket de logs', 'Ajouter une alarme de budget', 'Passer les templates dans cfn-lint et cfn-guard', 'Déployer avec un change set relu', 'Tester la dérive après une modification manuelle'],
    d: 'la modification manuelle est détectée et un template non conforme échoue en CI.',
  },
  links: [
    ['Guide CloudFormation', 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/Welcome.html', 'doc'],
    ['CloudFormation Workshop', 'https://catalog.workshops.aws/cfn101/en-US', 'lab'],
    ['cfn-lint', 'https://github.com/aws-cloudformation/cfn-lint', 'repo'],
    ['cfn-guard', 'https://github.com/aws-cloudformation/cloudformation-guard', 'repo'],
  ],
});
