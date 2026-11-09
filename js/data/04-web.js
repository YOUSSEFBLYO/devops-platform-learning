M({
  id: 'nginx', name: 'Nginx', stage: 'web', icon: 'nginx', h: 10, sim: 'lb', simCfg: { lb: 'Nginx' }, pre: ['linux'],
  pitch: 'Serveur web et reverse proxy rapide, présent devant une énorme part du web.',
  l: [[
    ['Servir un site', `Nginx repose sur des blocs : \`http\` contient des \`server\`, qui contiennent des \`location\`. Teste toujours la configuration avant de recharger.`, `server {
    listen 80;
    server_name exemple.fr;
    root /var/www/exemple;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
# sudo nginx -t && sudo systemctl reload nginx`, 'nginx', '`reload` applique la configuration sans couper les connexions. `restart` les coupe.'],
  ], [
    ['Reverse proxy et TLS', `En **reverse proxy**, Nginx reçoit les requêtes et les transmet à ton application. Il termine le TLS, compresse et transmet l'adresse d'origine du client par des en-têtes.`, `upstream api {
    least_conn;
    server 10.0.0.11:8080 max_fails=3 fail_timeout=30s;
    server 10.0.0.12:8080 max_fails=3 fail_timeout=30s;
}
server {
    listen 443 ssl;
    http2 on;
    server_name api.exemple.fr;
    ssl_certificate     /etc/letsencrypt/live/api.exemple.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.exemple.fr/privkey.pem;

    location / {
        proxy_pass http://api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}`, 'nginx'],
  ], [
    ['Cache, limitation et performance', `Nginx sait mettre en cache des réponses et limiter le débit par client. Il protège ainsi l'application contre les pics. Les \`worker_connections\`, le \`keepalive\` vers les backends et le cache disque font une vraie différence à forte charge.`, `limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
proxy_cache_path /var/cache/nginx keys_zone=pages:50m max_size=2g inactive=30m;

server {
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://api;
    }
    location /catalogue/ {
        proxy_cache pages;
        proxy_cache_valid 200 5m;
        proxy_cache_use_stale error timeout updating;
        add_header X-Cache $upstream_cache_status;
        proxy_pass http://api;
    }
}`, 'nginx'],
  ]],
  lab: {
    ctx: 'Tu publies une nouvelle configuration Nginx sur un serveur en production.',
    prompt: 'root@web-01:/etc/nginx#',
    steps: [
      ['Vérifie la syntaxe de la configuration.', '^nginx -t', 'nginx -t', `nginx: [emerg] unexpected "}" in /etc/nginx/sites-enabled/api:14
nginx: configuration file /etc/nginx/nginx.conf test failed`],
      ['Affiche la ligne en cause : `sites-enabled/api`, lignes 10 à 14, avec `sed`.', '^sed -n .*10,14p.*sites-enabled/api', "sed -n '10,14p' sites-enabled/api", `    location / {
        proxy_pass http://api
        proxy_set_header Host $host;
    }
}`],
      ['Ajoute le `;` manquant ligne 11 avec `sed -i`.', '^sed -i .*11.*sites-enabled/api', "sed -i '11s/$/;/' sites-enabled/api", ''],
      ['Teste de nouveau.', '^nginx -t', 'nginx -t', 'nginx: configuration file /etc/nginx/nginx.conf test is successful'],
      ['Recharge sans coupure.', '^(systemctl reload nginx|nginx -s reload)', 'systemctl reload nginx', ''],
      ['Vérifie la réponse avec les en-têtes.', '^curl -[a-zA-Z]*I', 'curl -I https://api.exemple.fr', 'HTTP/2 200\nserver: nginx\nx-cache: MISS'],
    ],
  },
  quiz: [
    ['Quelle commande valide la configuration ?', ['`nginx -t`', '`nginx --go`', '`curl -t`', '`systemctl test`'], 0, 'À lancer systématiquement avant un reload.'],
    ['Quel est le rôle d\'un reverse proxy ?', ['Recevoir les requêtes et les relayer vers les backends', 'Compiler le code', 'Stocker les logs', 'Remplacer le DNS'], 0, 'Il masque et protège les serveurs applicatifs.'],
    ['Comment transmettre l\'IP réelle au backend ?', ['Avec `X-Real-IP` ou `X-Forwarded-For`', 'Avec un cookie', 'Avec `chmod`', 'Elle est transmise seule'], 0, 'Le backend ne voit sinon que l\'IP du proxy.'],
    ['Quelle directive limite le débit par client ?', ['`limit_req`', '`gzip`', '`root`', '`include`'], 0, 'Elle se combine avec `limit_req_zone`.'],
  ],
  project: {
    t: 'Reverse proxy complet',
    b: 'Place Nginx devant deux instances d\'API avec TLS et cache.',
    s: ['Lancer deux API et Nginx avec Docker Compose', 'Répartir la charge avec `least_conn`', 'Générer un certificat avec `mkcert` ou Let\'s Encrypt', 'Rediriger HTTP vers HTTPS et ajouter HSTS', 'Mettre en cache une route et limiter `/api`', 'Tester avec `k6` et comparer avec et sans cache'],
    d: 'SSL Labs ou `testssl.sh` donnent un bon score et une API arrêtée ne produit aucune erreur côté client.',
  },
  links: [
    ['Documentation Nginx', 'https://nginx.org/en/docs/', 'doc'],
    ['Générateur Mozilla SSL', 'https://ssl-config.mozilla.org/', 'lab'],
    ['Nginx Playground', 'https://nginx-playground.wizardzines.com/', 'lab'],
    ['Let\'s Encrypt', 'https://letsencrypt.org/fr/docs/', 'doc'],
  ],
});

M({
  id: 'caddy', name: 'Caddy', stage: 'web', icon: 'caddy', h: 5, sim: 'lb', simCfg: { lb: 'Caddy' }, pre: ['linux'],
  pitch: 'Le serveur web qui obtient et renouvelle ses certificats HTTPS tout seul.',
  l: [[
    ['HTTPS sans y penser', `Le fichier **Caddyfile** est très court. Dès qu'un nom de domaine est indiqué, Caddy obtient un certificat, redirige HTTP vers HTTPS et renouvelle le certificat.`, `exemple.fr {
    root * /var/www/exemple
    file_server
    encode gzip zstd
}

api.exemple.fr {
    reverse_proxy localhost:8080
}
# caddy run --config Caddyfile`, 'caddy'],
  ], [
    ['Répartition et snippets', `\`reverse_proxy\` gère la répartition de charge, les health checks et les nouvelles tentatives. Les **snippets** évitent de répéter la configuration.`, `(securite) {
    header {
        Strict-Transport-Security "max-age=31536000"
        X-Content-Type-Options nosniff
        -Server
    }
}
api.exemple.fr {
    import securite
    reverse_proxy app1:8080 app2:8080 {
        lb_policy least_conn
        health_uri /healthz
        health_interval 5s
        lb_try_duration 3s
    }
}`, 'caddy'],
  ], [
    ['API d\'administration et On-Demand TLS', `Caddy se pilote aussi par une **API JSON** : il recharge sa configuration à chaud sans fichier. Avec l'**On-Demand TLS**, il obtient un certificat à la première connexion, idéal pour un SaaS où chaque client a son domaine. Il s'étend avec des modules Go compilés par \`xcaddy\`.`, `{
    on_demand_tls {
        ask http://auth:9000/domaine-autorise
    }
}
https:// {
    tls { on_demand }
    reverse_proxy app:8080
}
# curl localhost:2019/config/ | jq .
# xcaddy build --with github.com/caddy-dns/cloudflare`, 'caddy', 'Sans le contrôle `ask`, n\'importe quel domaine pointant vers toi peut déclencher des demandes de certificats et te faire atteindre les limites de Let\'s Encrypt.'],
  ]],
  lab: {
    ctx: 'Publie une API en HTTPS avec Caddy en quelques commandes.',
    prompt: 'root@web-01:~#',
    steps: [
      ['Formate le `Caddyfile`.', '^caddy fmt.*', 'caddy fmt --overwrite Caddyfile', ''],
      ['Valide-le.', '^caddy validate', 'caddy validate --config Caddyfile', 'Valid configuration'],
      ['Démarre Caddy en arrière-plan.', '^caddy start', 'caddy start --config Caddyfile', 'Successfully started Caddy (pid=4412)'],
      ['Applique une nouvelle version sans coupure.', '^caddy reload', 'caddy reload --config Caddyfile', ''],
    ],
  },
  quiz: [
    ['Que fait Caddy dès qu\'un domaine est déclaré ?', ['Il obtient et renouvelle le certificat', 'Il crée un DNS', 'Il installe Docker', 'Il ouvre le port 22'], 0, 'C\'est sa fonctionnalité phare.'],
    ['Quelle est l\'utilité de On-Demand TLS ?', ['Obtenir un certificat à la première connexion', 'Compresser les images', 'Réduire la RAM', 'Faire du cache'], 0, 'Utile pour les domaines personnalisés de clients.'],
    ['Comment modifier la configuration à chaud par programme ?', ['Avec l\'API sur le port 2019', 'En redémarrant la machine', 'Avec `chmod`', 'Avec Git uniquement'], 0, 'L\'API admin écoute par défaut sur localhost:2019.'],
  ],
  project: {
    t: 'Plateforme multi-domaines',
    b: 'Sers plusieurs sites avec un seul Caddy.',
    s: ['Publier deux sites et une API', 'Mutualiser les en-têtes dans un snippet', 'Ajouter health checks et répartition', 'Activer un certificat wildcard par défi DNS', 'Vérifier le renouvellement dans les logs'],
    d: 'chaque domaine répond en HTTPS sans aucune commande de certificat de ta part.',
  },
  links: [
    ['Documentation Caddy', 'https://caddyserver.com/docs/', 'doc'],
    ['Tutoriel Caddyfile', 'https://caddyserver.com/docs/caddyfile-tutorial', 'cours'],
    ['Communauté Caddy', 'https://caddy.community/', 'blog'],
  ],
});

M({
  id: 'apache', name: 'Apache', stage: 'web', icon: 'apache', h: 6, sim: 'lb', simCfg: { lb: 'Apache' }, pre: ['linux'],
  pitch: 'Le serveur web historique, toujours très répandu, modulaire et configurable par répertoire.',
  l: [[
    ['VirtualHosts', `Apache sert plusieurs sites grâce aux **VirtualHosts**. Sous Debian, les sites vivent dans \`sites-available\` et s'activent avec \`a2ensite\`. Les modules s'activent avec \`a2enmod\`.`, `<VirtualHost *:80>
    ServerName exemple.fr
    DocumentRoot /var/www/exemple
    ErrorLog \${APACHE_LOG_DIR}/exemple-error.log
    CustomLog \${APACHE_LOG_DIR}/exemple-access.log combined
    <Directory /var/www/exemple>
        Require all granted
    </Directory>
</VirtualHost>
# a2ensite exemple && apachectl configtest && systemctl reload apache2`, 'apache'],
  ], [
    ['Modules et reverse proxy', `\`mod_rewrite\` réécrit les URL, \`mod_ssl\` gère le TLS et \`mod_proxy_balancer\` répartit la charge. Le fichier \`.htaccess\` permet une configuration par dossier, mais il ralentit le serveur : préfère la configuration principale si tu la contrôles.`, `<Proxy "balancer://api">
    BalancerMember "http://10.0.0.11:8080" retry=30
    BalancerMember "http://10.0.0.12:8080" retry=30
    ProxySet lbmethod=bybusyness
</Proxy>
<VirtualHost *:443>
    ServerName api.exemple.fr
    SSLEngine on
    ProxyPass "/" "balancer://api/"
    ProxyPassReverse "/" "balancer://api/"
</VirtualHost>`, 'apache'],
  ], [
    ['MPM et durcissement', `Le **MPM** détermine comment Apache gère les connexions. \`event\` est le meilleur choix moderne, avec PHP-FPM à part. \`prefork\` ne reste utile qu'avec \`mod_php\`. Le durcissement passe par le masquage de version, **mod_security** comme pare-feu applicatif, et la suppression des modules inutiles.`, `# mods-available/mpm_event.conf
<IfModule mpm_event_module>
    StartServers        2
    ThreadsPerChild     25
    MaxRequestWorkers   400
</IfModule>

ServerTokens Prod
ServerSignature Off
TraceEnable Off`, 'apache'],
  ]],
  lab: {
    ctx: 'Publie un nouveau site sur un serveur Apache Debian.',
    prompt: 'root@web-02:~#',
    steps: [
      ['Active le module `rewrite`.', '^a2enmod rewrite', 'a2enmod rewrite', 'Enabling module rewrite.'],
      ['Active le site `exemple`.', '^a2ensite exemple', 'a2ensite exemple', 'Enabling site exemple.'],
      ['Vérifie la configuration.', '^(apachectl|apache2ctl) (configtest|-t)', 'apachectl configtest', 'Syntax OK'],
      ['Recharge Apache.', '^(systemctl reload apache2|apachectl graceful)', 'systemctl reload apache2', ''],
      ['Affiche les modules chargés qui contiennent `mpm`.', '^(apachectl|apache2ctl) -M \\| grep mpm', 'apachectl -M | grep mpm', ' mpm_event_module (shared)'],
    ],
  },
  quiz: [
    ['Quelle commande active un site sous Debian ?', ['`a2ensite`', '`nginx -s`', '`apt enable`', '`chmod +x`'], 0, 'Elle crée un lien vers `sites-enabled`.'],
    ['Quel MPM privilégier aujourd\'hui ?', ['`event`', '`prefork`', 'Aucun', '`winnt`'], 0, 'Il gère beaucoup mieux les connexions inactives.'],
    ['Quel inconvénient a `.htaccess` ?', ['Il ralentit chaque requête', 'Il interdit HTTPS', 'Il supprime les logs', 'Il bloque PHP'], 0, 'Apache relit ces fichiers à chaque requête.'],
  ],
  project: {
    t: 'Migration Apache vers proxy moderne',
    b: 'Fais tourner une application PHP avec une configuration propre.',
    s: ['Installer Apache avec MPM event et PHP-FPM', 'Déclarer deux VirtualHosts', 'Activer TLS avec Certbot', 'Mettre `mod_security` en mode détection', 'Comparer les performances avec `wrk` entre prefork et event'],
    d: 'les deux sites répondent en HTTPS et tu sais expliquer l\'écart de performance mesuré.',
  },
  links: [
    ['Documentation Apache', 'https://httpd.apache.org/docs/current/fr/', 'doc'],
    ['Guide des MPM', 'https://httpd.apache.org/docs/current/fr/mpm.html', 'doc'],
    ['OWASP ModSecurity CRS', 'https://coreruleset.org/', 'doc'],
  ],
});

M({
  id: 'haproxy', name: 'HAProxy', stage: 'web', icon: 'haproxy', h: 7, sim: 'lb', simCfg: { lb: 'HAProxy' }, pre: ['linux'],
  pitch: 'Le spécialiste de la répartition de charge TCP et HTTP, réputé pour ses performances.',
  l: [[
    ['Frontends et backends', `Un **frontend** reçoit le trafic et un **backend** le distribue vers des serveurs. Le mot-clé \`check\` active les health checks.`, `global
    log stdout format raw local0
defaults
    mode http
    timeout connect 5s
    timeout client  30s
    timeout server  30s
frontend public
    bind :80
    default_backend api
backend api
    balance roundrobin
    option httpchk GET /healthz
    server app1 10.0.0.11:8080 check
    server app2 10.0.0.12:8080 check`, 'haproxy'],
  ], [
    ['ACL, sessions et statistiques', `Les **ACL** routent selon le chemin, l'en-tête ou l'IP. Les **stick tables** mémorisent des informations par client, pour limiter le débit ou garder la session. La page de statistiques montre l'état de chaque serveur.`, `frontend public
    bind :443 ssl crt /etc/haproxy/certs/
    acl is_api path_beg /api
    stick-table type ip size 100k expire 30s store http_req_rate(10s)
    http-request track-sc0 src
    http-request deny deny_status 429 if { sc_http_req_rate(0) gt 100 }
    use_backend api if is_api
    default_backend web

listen stats
    bind :8404
    stats enable
    stats uri /stats`, 'haproxy'],
  ], [
    ['Haute disponibilité sans coupure', `Pour éviter que le répartiteur soit lui-même un point de panne, on en place deux avec **keepalived**, qui fait flotter une adresse IP virtuelle grâce au protocole VRRP.

Le **Runtime API** retire un serveur à chaud pour une maintenance : il finit ses connexions puis sort du pool. Les rechargements se font sans perdre de connexion.`, `# Vider app1 avant maintenance
echo "set server api/app1 state drain" | socat stdio /run/haproxy/admin.sock
echo "show servers state" | socat stdio /run/haproxy/admin.sock

# keepalived.conf
vrrp_instance VI_1 {
    state MASTER
    interface eth0
    virtual_router_id 51
    priority 101
    virtual_ipaddress { 10.0.0.100/24 }
}`, 'bash'],
  ]],
  lab: {
    ctx: 'Mets un serveur en maintenance sans perdre une seule requête.',
    prompt: 'root@lb-01:~#',
    steps: [
      ['Valide la configuration.', '^haproxy -c -f /etc/haproxy/haproxy\\.cfg', 'haproxy -c -f /etc/haproxy/haproxy.cfg', 'Configuration file is valid'],
      ['Recharge le service.', '^systemctl reload haproxy', 'systemctl reload haproxy', ''],
      ['Passe `api/app1` en `drain` via le socket admin.', 'set server api/app1 state drain.*admin\\.sock', 'echo "set server api/app1 state drain" | socat stdio /run/haproxy/admin.sock', ''],
      ['Consulte l\'état des serveurs.', 'show (servers state|stat).*admin\\.sock', 'echo "show servers state" | socat stdio /run/haproxy/admin.sock', 'api app1 2 8 drain\napi app2 2 8 ready'],
      ['Après la maintenance, remets `app1` en `ready`.', 'set server api/app1 state ready.*admin\\.sock', 'echo "set server api/app1 state ready" | socat stdio /run/haproxy/admin.sock', ''],
    ],
  },
  quiz: [
    ['Que fait le mot-clé `check` ?', ['Il active le health check du serveur', 'Il valide la syntaxe', 'Il coupe le serveur', 'Il active TLS'], 0, 'Un serveur en échec sort du pool.'],
    ['À quoi sert une stick table ?', ['Mémoriser des compteurs par client', 'Stocker des images', 'Faire du DNS', 'Compiler le code'], 0, 'Elle sert à la limitation et à la persistance.'],
    ['Quel outil partage une IP virtuelle entre deux HAProxy ?', ['keepalived', 'Certbot', 'cron', 'Trivy'], 0, 'Il s\'appuie sur le protocole VRRP.'],
    ['Quelle différence entre le mode `tcp` et `http` ?', ['En `http`, HAProxy lit la requête', 'Aucune', 'Le mode `tcp` chiffre tout', 'Le mode `http` est plus lent par nature et interdit'], 0, 'En mode TCP, il ne voit que le flux, couche 4.'],
  ],
  project: {
    t: 'Répartiteur redondant',
    b: 'Monte deux HAProxy actif/passif devant trois serveurs.',
    s: ['Déployer trois backends et deux HAProxy', 'Terminer le TLS et router selon le chemin', 'Limiter le débit par IP avec une stick table', 'Partager une IP virtuelle avec keepalived', 'Exposer les métriques à Prometheus', 'Éteindre le HAProxy actif sous charge'],
    d: 'l\'IP virtuelle bascule en quelques secondes et les statistiques restent cohérentes.',
  },
  links: [
    ['Documentation HAProxy', 'https://docs.haproxy.org/', 'doc'],
    ['Blog HAProxy', 'https://www.haproxy.com/blog', 'blog'],
    ['Configuration tutorials', 'https://www.haproxy.com/documentation/haproxy-configuration-tutorials/', 'cours'],
  ],
});
