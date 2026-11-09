M({
  id: 'linux', name: 'Linux', stage: 'fondations', icon: 'linux', h: 20, sim: 'shell',
  pitch: 'Le système qui fait tourner presque tous les serveurs, conteneurs et clouds.',
  l: [[
    ['Se repérer dans le système', `Sous Linux, **tout est fichier** et tout part de la racine \`/\`. Les configurations vivent dans \`/etc\`, les journaux dans \`/var/log\`, tes fichiers dans \`/home\`.

Tu vas passer ta carrière à te déplacer et à lire. Apprends ces commandes jusqu'à ce qu'elles deviennent un réflexe.`, `pwd                 # où suis-je ?
ls -la /var/log     # lister, fichiers cachés et détails compris
cd /etc && ls       # se déplacer puis lister
cat /etc/os-release # afficher un fichier
less /var/log/syslog # lire page par page (q pour quitter)
tail -f /var/log/syslog # suivre un journal en direct`, 'bash', '`rm -rf` ne demande aucune confirmation et il n\'y a pas de corbeille. Vérifie toujours le chemin avec `ls` avant de supprimer.'],
    ['Utilisateurs et permissions', `Chaque fichier a un propriétaire, un groupe et trois jeux de droits : \`r\` lire, \`w\` écrire, \`x\` exécuter, pour le propriétaire, le groupe et les autres.

Dans \`-rwxr-x---\`, le propriétaire a tout, le groupe lit et exécute, les autres n'ont rien. En octal : \`750\`.`, `ls -l deploy.sh
# -rwxr-x--- 1 alice ops 1204 mar 3 deploy.sh
chmod 750 deploy.sh        # droits
chown alice:ops deploy.sh  # propriétaire et groupe
sudo useradd -m -G docker bob  # nouvel utilisateur
id bob                     # ses groupes`, 'bash', '`chmod 777` ne résout jamais rien : il ouvre le fichier à tout le monde. Cherche plutôt quel utilisateur a besoin de quel droit.'],
  ], [
    ['Processus et services', `Un **processus** est un programme en cours d'exécution. Un **service** est un processus géré par \`systemd\`, qui le démarre au boot et le relance en cas de crash.

Quand un serveur rame, le réflexe est : qui consomme le CPU, la mémoire, le disque ?`, `ps aux --sort=-%mem | head   # les plus gourmands en mémoire
top                           # vue en direct (htop si installé)
systemctl status nginx        # état du service
sudo systemctl restart nginx
journalctl -u nginx -n 50 -f  # ses journaux, en direct
df -h && free -h              # disque et mémoire`, 'bash'],
    ['Texte et réseau en ligne de commande', `Sur un serveur, on diagnostique avec du texte. Enchaîne de petits outils avec le pipe \`|\` : \`grep\` filtre, \`awk\` extrait, \`sort\` et \`uniq\` comptent.

Pour le réseau, retiens \`ss\` pour les ports ouverts, \`curl\` pour tester une URL, \`dig\` pour le DNS.`, `# Les 5 IP qui génèrent le plus de requêtes
awk '{print $1}' access.log | sort | uniq -c | sort -rn | head -5

ss -tulpn              # qui écoute sur quel port ?
curl -I https://exemple.fr  # en-têtes de la réponse
dig +short exemple.fr  # résolution DNS
ssh -i ~/.ssh/id_ed25519 deploy@10.0.0.5`, 'bash'],
  ], [
    ['Les briques des conteneurs', `Un conteneur n'est pas une petite VM : c'est un processus Linux isolé par le noyau. Les **namespaces** limitent ce qu'il voit (PID, réseau, montages), les **cgroups** limitent ce qu'il consomme (CPU, mémoire).

Comprendre cela explique pourquoi un conteneur démarre en quelques millisecondes et partage le noyau de l'hôte.`, `# Lancer un shell dans de nouveaux namespaces PID et montage
sudo unshare --pid --fork --mount-proc bash
ps aux   # ce shell se voit comme PID 1

# Voir les cgroups d'un service
systemd-cgls --no-pager | head -20
cat /sys/fs/cgroup/system.slice/nginx.service/memory.current`, 'bash'],
    ['Diagnostic avancé et durcissement', `Quand les logs ne disent rien, on observe les appels système avec \`strace\`, la charge disque avec \`iostat\`, les fichiers ouverts avec \`lsof\`. La méthode USE de Brendan Gregg vérifie pour chaque ressource son **U**tilisation, sa **S**aturation et ses **E**rreurs.

Pour le durcissement : SSH par clé uniquement, pare-feu en refus par défaut, mises à jour automatiques de sécurité.`, `strace -f -p 1234 -e trace=network   # appels réseau d'un process
lsof -p 1234 | wc -l                 # fichiers ouverts
iostat -xz 1                         # saturation disque
vmstat 1                             # file d'attente CPU

# /etc/ssh/sshd_config
PasswordAuthentication no
PermitRootLogin no`, 'bash', 'Garde une session SSH ouverte quand tu modifies `sshd_config`. Si la configuration est mauvaise, c\'est ta seule porte de sortie.'],
  ]],
  lab: {
    ctx: 'Une alerte indique que le serveur `web-01` manque de disque. Trouve la cause et remets le service en état.',
    real: ['OverTheWire Bandit, un jeu en SSH', 'https://overthewire.org/wargames/bandit/'],
    prompt: 'root@web-01:~#',
    steps: [
      ['Vérifie l\'espace disque en format lisible.', '^df (-h|-[a-zA-Z]*h)', 'df -h', `Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        40G   39G  412M  99% /
tmpfs           2.0G     0  2.0G   0% /run`],
      ['Trouve ce qui occupe `/var/log` : tailles des dossiers, triées.', '^du .*(/var/log|\\*).*', 'du -sh /var/log/* | sort -h', `4.0K    /var/log/auth.log
120M    /var/log/syslog
31G     /var/log/nginx`],
      ['Regarde les fichiers de `/var/log/nginx` avec leur taille.', '^ls .*-[a-zA-Z]*l.*(/var/log/nginx)?', 'ls -lh /var/log/nginx', `-rw-r----- 1 www-data adm 31G  mar 12 10:41 access.log
-rw-r----- 1 www-data adm 2.1M mar 12 10:40 error.log`],
      ['Vide `access.log` sans le supprimer, nginx le garde ouvert.', '^(truncate -s ?0|: ?>|> ?|cat /dev/null >) ?.*access\\.log', 'truncate -s 0 /var/log/nginx/access.log', ''],
      ['Contrôle que le service `nginx` tourne toujours.', '^systemctl status nginx', 'systemctl status nginx', `● nginx.service - A high performance web server
     Active: active (running) since Tue 09:12:03 UTC
   Main PID: 812 (nginx)`],
    ],
  },
  quiz: [
    ['Que signifie le mode `640` sur un fichier ?', ['Propriétaire lecture/écriture, groupe lecture, autres rien', 'Tout le monde peut lire', 'Propriétaire exécution seule', 'Groupe lecture/écriture'], 0, '6 = rw-, 4 = r--, 0 = ---.'],
    ['Quelle commande montre les ports en écoute ?', ['`ss -tulpn`', '`ps aux`', '`df -h`', '`chmod`'], 0, '`ss` remplace l\'ancien `netstat`.'],
    ['Le disque est plein mais `du` ne trouve rien de gros. Cause probable ?', ['Un fichier supprimé reste ouvert par un processus', 'La RAM est saturée', 'Le DNS ne répond pas', 'Le CPU est lent'], 0, '`lsof +L1` liste ces fichiers supprimés mais encore ouverts.'],
    ['Quelle fonction du noyau limite la mémoire d\'un conteneur ?', ['Les cgroups', 'Les namespaces', 'chroot', 'systemd-resolved'], 0, 'Les namespaces isolent la vue, les cgroups limitent les ressources.'],
    ['Comment suivre les journaux d\'un service systemd en direct ?', ['`journalctl -u nom -f`', '`cat service.log`', '`systemctl logs`', '`dmesg -u`'], 0, '`-f` suit le flux comme `tail -f`.'],
  ],
  project: {
    t: 'Serveur web durci',
    b: 'Prépare une VM Ubuntu (Multipass, VirtualBox ou petite instance cloud) comme un vrai serveur de production, sans outil d\'automatisation pour l\'instant.',
    s: ['Créer un utilisateur `deploy` avec `sudo` et une clé SSH Ed25519', 'Interdire le mot de passe et la connexion root dans `sshd_config`', 'Activer `ufw` : refus par défaut, seuls 22, 80 et 443 ouverts', 'Installer nginx et publier une page statique', 'Installer `unattended-upgrades` et `fail2ban`', 'Écrire un service systemd qui relance un script maison en cas de crash'],
    d: 'une connexion par mot de passe échoue, `ss -tulpn` ne montre que les ports voulus, et le service maison revient seul après un `kill -9`.',
    x: 'Ajoute une rotation des logs avec `logrotate` et une alerte par mail quand le disque dépasse 80 %.',
  },
  links: [
    ['The Linux Command Line, livre gratuit', 'https://linuxcommand.org/tlcl.php', 'book'],
    ['OverTheWire Bandit', 'https://overthewire.org/wargames/bandit/', 'lab'],
    ['Linux Journey', 'https://linuxjourney.com/', 'cours'],
    ['Méthode USE de Brendan Gregg', 'https://www.brendangregg.com/usemethod.html', 'blog'],
    ['Roadmap Linux', 'https://roadmap.sh/linux', 'cours'],
    ['Killercoda, scénarios Linux', 'https://killercoda.com/', 'lab'],
  ],
});

M({
  id: 'bash', name: 'Bash', stage: 'fondations', icon: 'gnubash', h: 12, sim: 'shell', pre: ['linux'],
  simIntro: 'Bash brille quand on enchaîne les commandes. Utilise ce bac à sable pour t\'exercer aux pipes et aux redirections : `ls`, `cd`, `cat`, `grep`, `wc -l`, `|` et `>`.',
  pitch: 'Le langage qui colle tous les outils entre eux.',
  l: [[
    ['Ton premier script', `Un script Bash est une liste de commandes dans un fichier. La première ligne, le **shebang**, indique l'interpréteur.

Les variables se lisent avec \`$\`. Mets-les toujours entre guillemets pour que les espaces ne cassent rien.`, `#!/usr/bin/env bash
nom="monde"
echo "Bonjour, $nom !"
date_du_jour=$(date +%F)   # capture la sortie d'une commande
echo "Nous sommes le $date_du_jour"

# chmod +x salut.sh && ./salut.sh`, 'bash', 'Pas d\'espace autour du `=` : `nom = "x"` provoque une erreur, Bash cherche une commande `nom`.'],
    ['Conditions et boucles', `\`[[ ... ]]\` teste une condition. Chaque commande renvoie un **code de sortie** : \`0\` pour le succès, autre chose pour l'échec. Il est disponible dans \`$?\`, et \`if\` s'en sert directement.`, `if [[ -f /etc/nginx/nginx.conf ]]; then
  echo "nginx configuré"
else
  echo "configuration absente" >&2
fi

for hote in web-1 web-2 web-3; do
  ping -c1 -W1 "$hote" >/dev/null && echo "$hote OK" || echo "$hote KO"
done`, 'bash'],
  ], [
    ['Scripts robustes', `Par défaut, Bash continue après une erreur. Pour un script de production, ajoute toujours le **mode strict** : arrêt à la première erreur, variable non définie interdite, échec d'un pipe détecté.

Les fonctions et les \`trap\` rendent le script propre, même s'il échoue au milieu.`, `#!/usr/bin/env bash
set -euo pipefail

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT   # nettoyage garanti

log() { printf '%s %s\\n' "$(date +%T)" "$*" >&2; }

sauvegarder() {
  local src=$1 dst=$2
  log "Sauvegarde de $src"
  tar czf "$TMP/backup.tgz" "$src"
  mv "$TMP/backup.tgz" "$dst"
}

sauvegarder "\${1:?Usage: $0 <dossier> <cible>}" "\${2:?cible manquante}"`, 'bash', 'Sans `pipefail`, `commande_qui_plante | tee log` renvoie 0 : ton script croit que tout va bien.'],
  ], [
    ['Automatisation de niveau production', `Un bon script se comporte comme un outil : options nommées, sortie lisible par une machine, exécution **idempotente**, verrou pour éviter deux exécutions simultanées.

Valide toujours tes scripts avec **ShellCheck**, en CI comme dans ton éditeur. Au-delà de 200 lignes, passe à Python ou Go.`, `#!/usr/bin/env bash
set -euo pipefail

exec 9>/var/lock/deploy.lock
flock -n 9 || { echo "Déploiement déjà en cours" >&2; exit 1; }

ENV=staging DRY_RUN=false
while getopts "e:n" opt; do
  case $opt in
    e) ENV=$OPTARG ;;
    n) DRY_RUN=true ;;
    *) exit 2 ;;
  esac
done

run() { if $DRY_RUN; then echo "[dry-run] $*"; else "$@"; fi; }
run kubectl -n "$ENV" rollout restart deployment/api`, 'bash'],
  ]],
  lab: {
    ctx: 'Tu écris un script de sauvegarde. Les commandes ci-dessous valident chaque réflexe de scripting.',
    real: ['Exercism, parcours Bash', 'https://exercism.org/tracks/bash'],
    steps: [
      ['Rends le script `backup.sh` exécutable.', '^chmod (\\+x|u\\+x|7[0-9]{2}) (\\./)?backup\\.sh', 'chmod +x backup.sh', ''],
      ['Analyse-le avec ShellCheck.', '^shellcheck (\\./)?backup\\.sh', 'shellcheck backup.sh', `In backup.sh line 7:
cp $SRC /backup
   ^--^ SC2086 (info): Double quote to prevent globbing and word splitting.`],
      ['Exécute-le en mode trace pour voir chaque commande.', '^bash -x (\\./)?backup\\.sh', 'bash -x backup.sh', `+ SRC=/var/www
+ cp /var/www /backup
cp: -r not specified; omitting directory '/var/www'`],
      ['Affiche le code de sortie de la dernière commande.', '^echo "?\\$\\?"?$', 'echo $?', '1'],
      ['Planifie le script tous les jours à 3 h : ouvre la crontab.', '^crontab -e', 'crontab -e', '0 3 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1\ncrontab: installing new crontab'],
    ],
  },
  quiz: [
    ['Que fait `set -e` ?', ['Arrête le script dès qu\'une commande échoue', 'Affiche chaque commande', 'Interdit les variables', 'Active les couleurs'], 0, '`-x` affiche les commandes, `-u` refuse les variables non définies.'],
    ['Pourquoi écrire `"$fichier"` avec des guillemets ?', ['Pour que les espaces ne découpent pas la valeur', 'Pour aller plus vite', 'Pour exporter la variable', 'Par pure convention'], 0, 'Sans guillemets, `mon rapport.txt` devient deux arguments.'],
    ['À quoi sert `trap \'...\' EXIT` ?', ['Exécuter un nettoyage à la sortie du script', 'Bloquer Ctrl+C', 'Lancer le script en tâche de fond', 'Forcer `exit 0`'], 0, 'Le code s\'exécute même si le script échoue.'],
    ['Quel outil détecte les erreurs courantes dans un script ?', ['ShellCheck', 'chmod', 'cron', 'awk'], 0, 'Il s\'intègre à l\'éditeur et à la CI.'],
  ],
  project: {
    t: 'Toolkit de maintenance',
    b: 'Écris `opsctl.sh`, un petit outil en ligne de commande utilisable par ton équipe.',
    s: ['Sous-commande `health` : CPU, mémoire, disque et services critiques', 'Sous-commande `backup <dossier>` avec rotation sur 7 jours', 'Sous-commande `logs <service>` : erreurs des 15 dernières minutes', 'Options `-n` (dry-run) et `-h` (aide)', 'Mode strict, verrou `flock` et nettoyage par `trap`', 'Script validé par ShellCheck sans avertissement'],
    d: '`shellcheck opsctl.sh` ne remonte rien et `opsctl.sh health` renvoie un code de sortie différent de 0 quand un service est arrêté.',
    x: 'Ajoute une sortie JSON avec `jq` et des tests avec Bats.',
  },
  links: [
    ['Bash Reference Manual', 'https://www.gnu.org/software/bash/manual/bash.html', 'doc'],
    ['ShellCheck', 'https://www.shellcheck.net/', 'lab'],
    ['Pure Bash Bible', 'https://github.com/dylanaraps/pure-bash-bible', 'repo'],
    ['explainshell.com', 'https://explainshell.com/', 'lab'],
    ['Exercism Bash', 'https://exercism.org/tracks/bash', 'lab'],
    ['Google Shell Style Guide', 'https://google.github.io/styleguide/shellguide.html', 'doc'],
  ],
});

M({
  id: 'python', name: 'Python', stage: 'fondations', icon: 'python', h: 18, pre: ['bash'],
  pitch: 'Le couteau suisse de l\'automatisation : API cloud, scripts d\'exploitation, outils internes.',
  l: [[
    ['Les bases utiles au DevOps', `Python se lit presque comme de l'anglais. Les blocs sont délimités par l'indentation. Les deux structures à maîtriser sont la **liste** et le **dictionnaire**, car le JSON et le YAML s'y traduisent directement.`, `serveurs = [
    {"nom": "web-1", "cpu": 82},
    {"nom": "web-2", "cpu": 34},
]

for s in serveurs:
    etat = "ALERTE" if s["cpu"] > 80 else "ok"
    print(f'{s["nom"]}: {etat}')

charges = [s["nom"] for s in serveurs if s["cpu"] > 80]
print(charges)  # ['web-1']`, 'python', 'Isole chaque projet dans un environnement virtuel avec `python -m venv .venv`. Installer dans le Python système casse des outils de l\'OS.'],
    ['Fichiers, JSON et ligne de commande', `Avec la bibliothèque standard, tu peux déjà faire beaucoup : lire des fichiers avec \`pathlib\`, traiter du JSON et lancer des commandes système avec \`subprocess\`.`, `import json, subprocess
from pathlib import Path

config = json.loads(Path("config.json").read_text())
print(config["env"])

res = subprocess.run(
    ["kubectl", "get", "pods", "-o", "json"],
    capture_output=True, text=True, check=True,
)
pods = json.loads(res.stdout)["items"]
print(len(pods), "pods")`, 'python'],
  ], [
    ['Appeler des API et gérer les erreurs', `Le quotidien DevOps, c'est interroger des API. \`requests\` fait le travail, et un bon script gère trois choses : les **timeouts**, les **erreurs HTTP** et les **nouvelles tentatives**.`, `import os, time, requests

def get_json(url, essais=3):
    for i in range(essais):
        try:
            r = requests.get(url, timeout=5,
                headers={"Authorization": f"Bearer {os.environ['TOKEN']}"})
            r.raise_for_status()
            return r.json()
        except requests.RequestException as e:
            if i == essais - 1:
                raise
            time.sleep(2 ** i)  # backoff exponentiel

print(get_json("https://api.github.com/repos/kubernetes/kubernetes")["stargazers_count"])`, 'python', 'Sans `timeout`, `requests` peut attendre indéfiniment et bloquer ton job de CI.'],
    ['Automatiser le cloud avec boto3', `\`boto3\` est le SDK AWS. Voici un cas réel : trouver les volumes EBS non attachés, qui coûtent de l'argent pour rien. Chaque cloud propose un SDK équivalent.`, `import boto3

ec2 = boto3.client("ec2", region_name="eu-west-3")
pages = ec2.get_paginator("describe_volumes").paginate(
    Filters=[{"Name": "status", "Values": ["available"]}]
)

total = 0
for page in pages:
    for v in page["Volumes"]:
        total += v["Size"]
        print(v["VolumeId"], v["Size"], "Go")
print(f"{total} Go orphelins")`, 'python'],
  ], [
    ['Packager un vrai outil', `Un outil partagé mérite une structure : \`pyproject.toml\`, une interface avec \`typer\` ou \`click\`, des tests \`pytest\`, un linter comme \`ruff\`. \`uv\` gère les dépendances et les environnements très rapidement.`, `# ops/cli.py
import typer
app = typer.Typer()

@app.command()
def scale(service: str, replicas: int = 3, dry_run: bool = False):
    """Ajuste le nombre de réplicas d'un service."""
    typer.echo(f"{service} -> {replicas} réplicas (dry-run={dry_run})")

# tests/test_cli.py
from typer.testing import CliRunner
from ops.cli import app

def test_scale():
    res = CliRunner().invoke(app, ["api", "--replicas", "5"])
    assert res.exit_code == 0 and "5" in res.stdout`, 'python'],
    ['Concurrence et opérateurs', `Interroger 500 serveurs un par un est trop lent. Pour des tâches qui attendent le réseau, \`asyncio\` lance des centaines d'appels en parallèle.

Avec le client Kubernetes ou **kopf**, Python sert aussi à écrire des opérateurs : un programme qui surveille des ressources et agit, comme le fait Kubernetes lui-même.`, `import asyncio, aiohttp

async def sonde(session, url):
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=3)) as r:
            return url, r.status
    except Exception:
        return url, "KO"

async def main(urls):
    async with aiohttp.ClientSession() as s:
        for url, etat in await asyncio.gather(*(sonde(s, u) for u in urls)):
            print(url, etat)

asyncio.run(main(["https://exemple.fr", "https://kubernetes.io"]))`, 'python'],
  ]],
  lab: {
    ctx: 'Tu prépares un outil Python pour ton équipe : environnement, dépendances, tests et lancement.',
    real: ['Exercism, parcours Python', 'https://exercism.org/tracks/python'],
    steps: [
      ['Crée un environnement virtuel `.venv`.', '^python3? -m venv \\.?venv', 'python -m venv .venv', ''],
      ['Active-le.', '^(source|\\.) \\.?venv/bin/activate', 'source .venv/bin/activate', '(.venv) environnement activé'],
      ['Installe `requests` et `pytest`.', '^(pip3?|python3? -m pip|uv pip) install .*requests.*pytest|^(pip3?|python3? -m pip) install .*pytest.*requests', 'pip install requests pytest', 'Successfully installed requests-2.32.3 pytest-8.3.4'],
      ['Fige les versions dans `requirements.txt`.', '^pip3? freeze > requirements\\.txt', 'pip freeze > requirements.txt', ''],
      ['Lance les tests.', '^(python3? -m )?pytest', 'pytest', `tests/test_cli.py ...                     [100%]
3 passed in 0.12s`],
    ],
  },
  quiz: [
    ['Pourquoi utiliser un environnement virtuel ?', ['Isoler les dépendances de chaque projet', 'Accélérer Python', 'Chiffrer le code', 'Remplacer Docker'], 0, 'Chaque projet garde ses propres versions.'],
    ['Que fait `r.raise_for_status()` ?', ['Lève une exception sur une réponse 4xx ou 5xx', 'Relance la requête', 'Affiche le statut', 'Ferme la connexion'], 0, 'Sans cet appel, une 500 passe silencieusement.'],
    ['Pour 200 appels HTTP simultanés, quel outil convient le mieux ?', ['`asyncio`', 'Une boucle `for`', '`time.sleep`', 'Un fichier JSON'], 0, 'Les appels réseau attendent surtout : la concurrence asynchrone est idéale.'],
    ['Comment paginer une liste AWS avec boto3 ?', ['`get_paginator`', '`while True` sans fin', '`limit=0`', 'C\'est impossible'], 0, 'Les paginators suivent les jetons `NextToken` pour toi.'],
  ],
  project: {
    t: 'Chasseur de gaspillage cloud',
    b: 'Construis une CLI qui inspecte un compte cloud et produit un rapport. Tu peux simuler AWS avec [moto](https://github.com/getmoto/moto) pour ne rien payer.',
    s: ['Créer le projet avec `pyproject.toml` et un environnement isolé', 'Lister volumes non attachés et IP élastiques inutilisées', 'Estimer le coût mensuel de chaque élément', 'Exporter le rapport en Markdown et en JSON', 'Écrire des tests `pytest` avec moto', 'Exécuter `ruff` et les tests dans une GitHub Action'],
    d: 'la commande affiche un rapport chiffré et tous les tests passent sans accès réel à AWS.',
    x: 'Publie le rapport chaque semaine dans un canal Slack via un webhook.',
  },
  links: [
    ['Documentation Python', 'https://docs.python.org/fr/3/', 'doc'],
    ['Automate the Boring Stuff', 'https://automatetheboringstuff.com/', 'book'],
    ['Documentation boto3', 'https://boto3.amazonaws.com/v1/documentation/api/latest/index.html', 'doc'],
    ['Exercism Python', 'https://exercism.org/tracks/python', 'lab'],
    ['Astral uv', 'https://docs.astral.sh/uv/', 'doc'],
    ['Real Python', 'https://realpython.com/', 'cours'],
  ],
});

M({
  id: 'go', name: 'Go', stage: 'fondations', icon: 'go', h: 16, pre: ['bash'],
  pitch: 'Le langage de Kubernetes, Docker, Terraform et Prometheus : binaires simples et concurrence native.',
  l: [[
    ['Premiers pas', `Go compile vers **un seul binaire** sans dépendance : parfait pour une image Docker minuscule. La syntaxe est volontairement petite. \`go run\` exécute, \`go build\` compile.`, `package main

import "fmt"

func main() {
	serveurs := []string{"web-1", "web-2"}
	for i, s := range serveurs {
		fmt.Printf("%d: %s\\n", i, s)
	}
}
// go mod init exemple && go run .`, 'go', 'Go refuse de compiler si une variable ou un import n\'est pas utilisé. C\'est voulu : le code reste propre.'],
    ['Structures et erreurs', `Go n'a pas d'exceptions : une fonction renvoie sa valeur **et** une erreur, que tu vérifies aussitôt. Ce style paraît verbeux au début, mais chaque chemin d'échec reste visible.`, `type Pod struct {
	Nom   string \`json:"name"\`
	Pret  bool   \`json:"ready"\`
}

func charger(chemin string) ([]Pod, error) {
	data, err := os.ReadFile(chemin)
	if err != nil {
		return nil, fmt.Errorf("lecture %s: %w", chemin, err)
	}
	var pods []Pod
	if err := json.Unmarshal(data, &pods); err != nil {
		return nil, err
	}
	return pods, nil
}`, 'go'],
  ], [
    ['Goroutines et channels', `Une **goroutine** est une fonction lancée en parallèle, très légère. Un **channel** permet aux goroutines d'échanger des données sans partager de mémoire. \`sync.WaitGroup\` attend qu'elles aient toutes fini.`, `func main() {
	urls := []string{"https://kubernetes.io", "https://go.dev"}
	res := make(chan string, len(urls))
	var wg sync.WaitGroup

	for _, u := range urls {
		wg.Add(1)
		go func(u string) {
			defer wg.Done()
			r, err := http.Get(u)
			if err != nil { res <- u + " KO"; return }
			defer r.Body.Close()
			res <- fmt.Sprintf("%s %d", u, r.StatusCode)
		}(u)
	}
	wg.Wait()
	close(res)
	for l := range res { fmt.Println(l) }
}`, 'go'],
    ['Un service HTTP observable', `Quelques lignes suffisent pour un service prêt pour la production : endpoints de santé, métriques Prometheus, arrêt propre sur \`SIGTERM\`, indispensable sous Kubernetes.`, `func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) { w.Write([]byte("ok")) })
	mux.Handle("/metrics", promhttp.Handler())
	srv := &http.Server{Addr: ":8080", Handler: mux}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM)
	defer stop()
	go srv.ListenAndServe()
	<-ctx.Done()

	c, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	srv.Shutdown(c) // termine les requêtes en cours
}`, 'go'],
  ], [
    ['Parler à Kubernetes avec client-go', `La plupart des outils cloud native sont écrits en Go. \`client-go\` est la bibliothèque officielle pour dialoguer avec l'API Kubernetes. C'est la base pour écrire contrôleurs et opérateurs, avec **controller-runtime** ou **Kubebuilder**.`, `cfg, _ := clientcmd.BuildConfigFromFlags("", clientcmd.RecommendedHomeFile)
cs, _ := kubernetes.NewForConfig(cfg)

pods, err := cs.CoreV1().Pods("default").List(ctx, metav1.ListOptions{})
if err != nil { log.Fatal(err) }
for _, p := range pods.Items {
	fmt.Println(p.Name, p.Status.Phase)
}`, 'go'],
    ['Tests, profilage et image minimale', `Go intègre les tests, les benchmarks et le profilage. Les **tests en table** couvrent de nombreux cas à peu de frais, et \`pprof\` montre où part le CPU. Le binaire statique tient ensuite dans une image \`scratch\` ou \`distroless\`.`, `# Dockerfile : image finale d'une dizaine de Mo
FROM golang:1.23 AS build
WORKDIR /src
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /app .

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /app /app
ENTRYPOINT ["/app"]`, 'dockerfile'],
  ]],
  lab: {
    ctx: 'Tu démarres un petit service Go et tu prépares son binaire pour la production.',
    real: ['Tour of Go', 'https://go.dev/tour/'],
    steps: [
      ['Initialise le module `example.com/sonde`.', '^go mod init example\\.com/sonde', 'go mod init example.com/sonde', 'go: creating new go.mod: module example.com/sonde'],
      ['Lance le programme.', '^go run (\\.|main\\.go)', 'go run .', 'sonde démarrée sur :8080'],
      ['Exécute les tests avec le détecteur de concurrence.', '^go test .*-race|^go test -race', 'go test -race ./...', 'ok  	example.com/sonde	0.214s'],
      ['Formate puis vérifie le code avec `go vet`.', '^go vet', 'go vet ./...', ''],
      ['Compile un binaire Linux statique dans `sonde`.', 'CGO_ENABLED=0.*go build.*-o sonde', 'CGO_ENABLED=0 GOOS=linux go build -o sonde .', ''],
    ],
  },
  quiz: [
    ['Pourquoi Go est-il apprécié pour les images Docker ?', ['Il produit un binaire statique', 'Il nécessite un JVM', 'Il remplace Linux', 'Il n\'a pas de compilateur'], 0, 'Le binaire peut tourner dans une image `scratch`.'],
    ['Comment Go signale-t-il une erreur ?', ['Par une valeur `error` renvoyée', 'Par `try/except`', 'Par un fichier', 'Il l\'ignore'], 0, 'L\'appelant doit la traiter explicitement.'],
    ['Quel outil synchronise des goroutines qui se terminent ?', ['`sync.WaitGroup`', '`fmt.Printf`', '`go mod`', '`pprof`'], 0, 'Il compte les goroutines encore actives.'],
    ['Pourquoi gérer `SIGTERM` dans un service ?', ['Pour terminer les requêtes avant que Kubernetes ne tue le pod', 'Pour accélérer le démarrage', 'Pour écrire les logs', 'Pour changer de port'], 0, 'Kubernetes envoie `SIGTERM` puis `SIGKILL` après le délai de grâce.'],
  ],
  project: {
    t: 'Sonde de disponibilité',
    b: 'Écris un service Go qui surveille une liste d\'URL et expose des métriques Prometheus.',
    s: ['Lire les cibles depuis un fichier YAML', 'Interroger chaque cible en parallèle à intervalle régulier', 'Exposer `/metrics` avec la latence et le statut', 'Ajouter `/healthz` et l\'arrêt propre sur `SIGTERM`', 'Écrire des tests en table', 'Livrer une image distroless de moins de 25 Mo'],
    d: 'Prometheus scrape la sonde et les métriques de chaque cible apparaissent dans Grafana.',
    x: 'Transforme la sonde en opérateur : les cibles deviennent une ressource Kubernetes personnalisée.',
  },
  links: [
    ['A Tour of Go', 'https://go.dev/tour/', 'lab'],
    ['Effective Go', 'https://go.dev/doc/effective_go', 'doc'],
    ['Go by Example', 'https://gobyexample.com/', 'cours'],
    ['Learn Go with Tests', 'https://quii.gitbook.io/learn-go-with-tests', 'book'],
    ['Kubebuilder Book', 'https://book.kubebuilder.io/', 'book'],
    ['client-go', 'https://github.com/kubernetes/client-go', 'repo'],
  ],
});
