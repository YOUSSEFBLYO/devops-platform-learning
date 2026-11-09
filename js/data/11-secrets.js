M({
  id: 'vault', name: 'Vault', stage: 'secrets', icon: 'vault', h: 12, sim: 'vault', pre: ['linux'],
  pitch: 'Un coffre central pour les secrets, avec des identifiants temporaires générés à la demande.',
  l: [[
    ['Stocker et lire', `Vault chiffre tout. Au démarrage, il est **scellé** et ne peut rien lire. Le moteur **KV** stocke des secrets versionnés, et un **jeton** identifie celui qui demande. Le fork libre s'appelle **OpenBao**.`, `vault server -dev &          # uniquement pour apprendre
export VAULT_ADDR=http://127.0.0.1:8200

vault kv put secret/boutique/db password=S3cret
vault kv get -field=password secret/boutique/db
vault kv metadata get secret/boutique/db   # versions`, 'bash', 'Le mode `-dev` garde tout en mémoire, sans TLS. Ne l\'utilise jamais pour de vraies données.'],
  ], [
    ['Politiques et authentification', `Une **policy** définit les chemins accessibles. Une **méthode d'authentification** transforme une identité en jeton : Kubernetes pour les pods, OIDC pour les humains, AppRole pour les machines.`, `# boutique.hcl
path "secret/data/boutique/*" {
  capabilities = ["read"]
}

vault policy write boutique boutique.hcl
vault auth enable kubernetes
vault write auth/kubernetes/role/boutique \\
  bound_service_account_names=api \\
  bound_service_account_namespaces=boutique \\
  policies=boutique ttl=1h`, 'bash'],
  ], [
    ['Secrets dynamiques et chiffrement', `Plutôt qu'un mot de passe partagé, Vault crée un compte de base de données à la demande, avec une durée de vie courte. En cas de fuite, il suffit de **révoquer le bail**. Le moteur **Transit** chiffre pour les applications, sans leur donner la clé.

En production : Raft en HA, **auto-unseal** avec un KMS, journal d'audit activé.`, `vault secrets enable database
vault write database/config/boutique \\
  plugin_name=postgresql-database-plugin \\
  connection_url="postgresql://{{username}}:{{password}}@db:5432/app" \\
  allowed_roles=app username=vault password=…
vault write database/roles/app \\
  db_name=boutique default_ttl=1h max_ttl=24h \\
  creation_statements="CREATE ROLE \\"{{name}}\\" LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}';"

vault read database/creds/app
vault lease revoke -prefix database/creds/app
vault audit enable file file_path=/var/log/vault/audit.log`, 'bash'],
  ]],
  lab: {
    ctx: 'Démarre un Vault de test, écris une politique et récupère un secret avec le bon droit.',
    real: ['Tutoriels Vault', 'https://developer.hashicorp.com/vault/tutorials'],
    prompt: 'ops@bastion:~$',
    steps: [
      ['Vérifie l\'état de Vault.', '^vault status', 'vault status', 'Sealed       false\nStorage Type raft\nHA Enabled   true'],
      ['Écris `password=S3cret` dans `secret/boutique/db`.', '^vault kv put secret/boutique/db password=', 'vault kv put secret/boutique/db password=S3cret', 'Secret Path  secret/data/boutique/db\nVersion      1'],
      ['Enregistre la politique `boutique` depuis `boutique.hcl`.', '^vault policy write boutique boutique\\.hcl', 'vault policy write boutique boutique.hcl', 'Success! Uploaded policy: boutique'],
      ['Crée un jeton avec cette politique, durée 1 h.', '^vault token create .*-policy[ =]boutique', 'vault token create -policy=boutique -ttl=1h', 'token          hvs.CAESIJx…\ntoken_duration 1h\npolicies       ["boutique"]'],
      ['Lis uniquement le champ `password`.', '^vault kv get .*-field[ =]password secret/boutique/db', 'vault kv get -field=password secret/boutique/db', 'S3cret'],
    ],
  },
  quiz: [
    ['Quel est l\'intérêt d\'un secret dynamique ?', ['Il expire seul et se révoque individuellement', 'Il est plus long', 'Il est gratuit', 'Il est stocké dans Git'], 0, 'Une fuite a une durée de vie très limitée.'],
    ['Que signifie « scellé » ?', ['Vault ne peut pas déchiffrer ses données', 'Vault est supprimé', 'Le réseau est coupé', 'L\'audit est actif'], 0, 'Il faut plusieurs parts de clé ou un KMS.'],
    ['Comment un pod s\'authentifie-t-il ?', ['Avec son ServiceAccount', 'Avec un mot de passe dans l\'image', 'Avec une clé SSH', 'Il ne peut pas'], 0, 'Vault vérifie le jeton auprès de Kubernetes.'],
    ['Que fait le moteur Transit ?', ['Il chiffre sans donner la clé', 'Il transporte des fichiers', 'Il gère le DNS', 'Il fait du VPN'], 0, 'Le chiffrement devient un service.'],
  ],
  project: {
    t: 'Zéro secret statique',
    b: 'Fais tourner une application sans aucun mot de passe permanent.',
    s: ['Installer Vault en HA sur Kubernetes avec Helm', 'Activer l\'authentification Kubernetes', 'Générer des identifiants PostgreSQL dynamiques', 'Injecter les secrets avec External Secrets ou Vault Agent', 'Activer l\'audit et vérifier les accès', 'Simuler une fuite et révoquer'],
    d: 'aucun mot de passe de base n\'est présent dans Git ni dans les manifestes.',
  },
  links: [
    ['Tutoriels Vault', 'https://developer.hashicorp.com/vault/tutorials', 'cours'],
    ['OpenBao', 'https://openbao.org/docs/', 'doc'],
    ['External Secrets Operator', 'https://external-secrets.io/', 'doc'],
    ['OWASP Secrets Management', 'https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html', 'doc'],
  ],
});

M({
  id: 'sealed', name: 'Sealed Secrets', stage: 'secrets', mono: 'SS', h: 5, sim: 'sealed', pre: ['k8s'],
  pitch: 'Chiffrer un Secret Kubernetes pour pouvoir le committer dans Git en toute sécurité.',
  l: [[
    ['Le problème du base64', `Un \`Secret\` Kubernetes est seulement encodé en base64 : ce n'est pas un chiffrement. **Sealed Secrets** résout cela avec un chiffrement asymétrique. \`kubeseal\` chiffre avec la clé publique, et seul le contrôleur du cluster détient la clé privée.`, `helm install sealed-secrets oci://registry-1.docker.io/bitnamicharts/sealed-secrets -n kube-system

kubectl create secret generic db --from-literal=password=S3cret \\
  --dry-run=client -o yaml > secret.yaml

kubeseal --format yaml < secret.yaml > sealed.yaml
rm secret.yaml
git add sealed.yaml && git commit -m "chore: secret de base"`, 'bash'],
  ], [
    ['Portées et rotation', `Par défaut, un secret scellé est lié à son **nom et son namespace** : le copier ailleurs ne fonctionne pas. Il existe trois portées : \`strict\`, \`namespace-wide\` et \`cluster-wide\`. Le contrôleur renouvelle sa clé tous les 30 jours et garde les anciennes.`, `kubeseal --scope namespace-wide --format yaml < secret.yaml > sealed.yaml
kubeseal --fetch-cert > cert.pem       # chiffrer hors ligne
kubeseal --cert cert.pem < secret.yaml > sealed.yaml
kubeseal --re-encrypt < sealed.yaml > nouveau.yaml`, 'bash', 'Renouveler la clé de chiffrement ne change pas le mot de passe. Si un secret a fuité, il faut changer la valeur elle-même.'],
  ], [
    ['Sauvegarde et alternatives', `Si tu perds la clé privée, tes secrets scellés deviennent illisibles. Sauvegarde-la dans un endroit sûr. **SOPS** chiffre les valeurs d'un fichier avec age ou un KMS, et **External Secrets Operator** tire les secrets d'un coffre externe. Ce dernier convient mieux aux grandes organisations.`, `# Sauvegarder les clés du contrôleur
kubectl get secret -n kube-system \\
  -l sealedsecrets.bitnami.com/sealed-secrets-key \\
  -o yaml > cles-sealed-secrets.yaml   # à stocker chiffré, hors du dépôt

# Alternative : SOPS avec age
sops --encrypt --age age1… --encrypted-regex '^(data|stringData)$' secret.yaml > secret.enc.yaml`, 'bash'],
  ]],
  lab: {
    ctx: 'Chiffre un mot de passe et publie-le dans Git.',
    real: ['Dépôt Sealed Secrets', 'https://github.com/bitnami-labs/sealed-secrets'],
    prompt: 'ops@bastion:~/deploy$',
    steps: [
      ['Crée localement un secret `db` avec `password=S3cret`, en `--dry-run=client`, vers `secret.yaml`.', '^kubectl create secret generic db .*--dry-run=client.*secret\\.yaml', 'kubectl create secret generic db --from-literal=password=S3cret --dry-run=client -o yaml > secret.yaml', ''],
      ['Scelle-le vers `sealed.yaml`.', '^kubeseal .*sealed\\.yaml', 'kubeseal --format yaml < secret.yaml > sealed.yaml', ''],
      ['Supprime le fichier en clair.', '^(rm|shred -u) secret\\.yaml', 'rm secret.yaml', ''],
      ['Applique le fichier scellé.', '^kubectl apply -f sealed\\.yaml', 'kubectl apply -f sealed.yaml', 'sealedsecret.bitnami.com/db created'],
      ['Vérifie que le contrôleur a créé le Secret `db`.', '^kubectl get secrets? db', 'kubectl get secret db', 'NAME   TYPE     DATA   AGE\ndb     Opaque   1      4s'],
    ],
  },
  quiz: [
    ['Pourquoi peut-on committer un SealedSecret ?', ['Seul le contrôleur peut le déchiffrer', 'Il est encodé en base64', 'Git le chiffre', 'Il est vide'], 0, 'Le chiffrement est asymétrique.'],
    ['Que se passe-t-il si tu perds la clé privée ?', ['Les secrets scellés sont irrécupérables', 'Rien', 'Kubernetes la recrée', 'Git la garde'], 0, 'D\'où l\'importance de sa sauvegarde.'],
    ['Quelle portée lie le secret à son nom et son namespace ?', ['`strict`', '`global`', '`none`', '`public`'], 0, 'C\'est le réglage par défaut.'],
  ],
  project: {
    t: 'Dépôt GitOps sans secret en clair',
    b: 'Ajoute les secrets à ton dépôt GitOps.',
    s: ['Installer le contrôleur', 'Sceller tous les secrets de l\'application', 'Faire déployer les secrets par Argo CD ou Flux', 'Sauvegarder les clés et tester une restauration', 'Ajouter gitleaks à la CI'],
    d: 'un nouveau cluster restauré avec la clé relit tous les secrets du dépôt.',
  },
  links: [
    ['Sealed Secrets sur GitHub', 'https://github.com/bitnami-labs/sealed-secrets', 'repo'],
    ['SOPS', 'https://getsops.io/', 'doc'],
    ['External Secrets Operator', 'https://external-secrets.io/', 'doc'],
    ['gitleaks', 'https://github.com/gitleaks/gitleaks', 'repo'],
  ],
});
