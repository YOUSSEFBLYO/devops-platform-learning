M({
  id: 'ansible', name: 'Ansible', stage: 'config', icon: 'ansible', h: 14, sim: 'converge', simCfg: { tool: 'ansible-playbook site.yml' }, pre: ['linux'],
  pitch: 'Configurer des dizaines de serveurs avec du YAML, en SSH, sans agent à installer.',
  l: [[
    ['Inventaire et playbook', `L'**inventaire** liste les machines. Un **playbook** décrit des tâches, et chaque tâche appelle un **module** idempotent : il ne change rien si l'état est déjà correct.`, `# inventory.ini
[web]
web-1 ansible_host=10.0.0.11
web-2 ansible_host=10.0.0.12

# site.yml
- hosts: web
  become: true
  tasks:
    - name: Installer nginx
      ansible.builtin.apt: { name: nginx, state: present, update_cache: true }
    - name: Démarrer nginx
      ansible.builtin.service: { name: nginx, state: started, enabled: true }

# ansible-playbook -i inventory.ini site.yml`, 'yaml', 'Évite `shell:` quand un module existe : il n\'est pas idempotent et rapporte `changed` à chaque passage.'],
  ], [
    ['Templates, handlers et rôles', `Les **templates Jinja2** génèrent des fichiers par hôte. Un **handler** redémarre un service seulement si un fichier a changé. Un **rôle** range tâches, variables et templates pour les réutiliser.`, `# roles/nginx/tasks/main.yml
- name: Déployer la configuration
  ansible.builtin.template:
    src: site.conf.j2
    dest: /etc/nginx/conf.d/site.conf
    validate: nginx -t -c %s
  notify: Recharger nginx

# roles/nginx/handlers/main.yml
- name: Recharger nginx
  ansible.builtin.service: { name: nginx, state: reloaded }

# roles/nginx/templates/site.conf.j2
# server { listen 80; server_name {{ inventory_hostname }}; }`, 'yaml'],
  ], [
    ['Vault, tests et déploiements progressifs', `**Ansible Vault** chiffre les secrets dans le dépôt. **Molecule** teste un rôle dans des conteneurs. \`serial\` déploie par lots et \`max_fail_percentage\` arrête si trop d'hôtes échouent. Un **inventaire dynamique** interroge le cloud directement.`, `- hosts: web
  serial: "25%"
  max_fail_percentage: 10
  pre_tasks:
    - name: Sortir du répartiteur
      community.general.haproxy: { state: disabled, host: "{{ inventory_hostname }}", backend: api }
      delegate_to: lb-1
  roles: [app]
  post_tasks:
    - name: Vérifier la santé
      ansible.builtin.uri: { url: "http://{{ inventory_hostname }}:8080/healthz" }
      retries: 10
      delay: 3

# ansible-vault encrypt group_vars/prod/secrets.yml
# molecule test`, 'yaml'],
  ]],
  lab: {
    ctx: 'Configure un parc de serveurs web, d\'abord à blanc, puis réellement.',
    real: ['Playground Ansible sur Killercoda', 'https://killercoda.com/ansible'],
    prompt: 'ops@controle:~/ansible$',
    steps: [
      ['Vérifie la connexion à tous les hôtes avec le module `ping`.', '^ansible .*all .*-m ping|^ansible all .*-m ping', 'ansible all -i inventory.ini -m ping', 'web-1 | SUCCESS => { "ping": "pong" }\nweb-2 | SUCCESS => { "ping": "pong" }'],
      ['Valide la syntaxe de `site.yml`.', '^ansible-playbook .*--syntax-check', 'ansible-playbook -i inventory.ini site.yml --syntax-check', 'playbook: site.yml'],
      ['Lance un essai à blanc, avec les différences.', '^ansible-playbook .*--check', 'ansible-playbook -i inventory.ini site.yml --check --diff', 'PLAY RECAP\nweb-1 : ok=3 changed=2 failed=0\nweb-2 : ok=3 changed=2 failed=0'],
      ['Applique le playbook sur le seul hôte `web-1`.', '^ansible-playbook .*(--limit|-l)[ =]web-1', 'ansible-playbook -i inventory.ini site.yml --limit web-1', 'PLAY RECAP\nweb-1 : ok=3 changed=2 failed=0'],
      ['Applique sur tout le parc.', '^ansible-playbook (?!.*--check)(?!.*--limit).*site\\.yml', 'ansible-playbook -i inventory.ini site.yml', 'PLAY RECAP\nweb-1 : ok=3 changed=0 failed=0\nweb-2 : ok=3 changed=2 failed=0'],
      ['Chiffre le fichier `group_vars/prod/secrets.yml`.', '^ansible-vault encrypt group_vars/prod/secrets\\.yml', 'ansible-vault encrypt group_vars/prod/secrets.yml', 'Encryption successful'],
    ],
  },
  quiz: [
    ['Pourquoi dit-on Ansible « sans agent » ?', ['Il se connecte en SSH', 'Il ne fait rien', 'Il tourne dans le navigateur', 'Il utilise un serveur central obligatoire'], 0, 'Seuls SSH et Python sont requis sur la cible.'],
    ['Que signifie idempotent ?', ['Relancer ne change rien si l\'état est correct', 'Aller plus vite', 'Chiffrer', 'Lancer en parallèle'], 0, 'C\'est la propriété centrale de la gestion de configuration.'],
    ['À quoi sert un handler ?', ['Réagir seulement si une tâche a changé quelque chose', 'Compiler un rôle', 'Stocker une clé', 'Tester la syntaxe'], 0, 'Il évite les redémarrages inutiles.'],
    ['Comment déployer par lots ?', ['Avec `serial`', 'Avec `become`', 'Avec `gather_facts`', 'Avec `include`'], 0, 'Un quart du parc à la fois, par exemple.'],
  ],
  project: {
    t: 'Parc web piloté par Ansible',
    b: 'Automatise entièrement le serveur durci du module Linux, sur trois VM ou conteneurs.',
    s: ['Écrire un inventaire avec `dev` et `prod`', 'Créer les rôles `base`, `nginx`, `app`', 'Chiffrer les secrets avec Ansible Vault', 'Tester un rôle avec Molecule', 'Déployer sans coupure avec `serial`', 'Lancer le tout depuis la CI'],
    d: 'un second passage rapporte `changed=0` et une nouvelle VM est prête en une commande.',
  },
  links: [
    ['Documentation Ansible', 'https://docs.ansible.com/', 'doc'],
    ['Ansible Galaxy', 'https://galaxy.ansible.com/', 'doc'],
    ['Molecule', 'https://ansible.readthedocs.io/projects/molecule/', 'doc'],
    ['Killercoda Ansible', 'https://killercoda.com/ansible', 'lab'],
    ['Ansible for DevOps', 'https://www.ansiblefordevops.com/', 'book'],
  ],
});

M({
  id: 'chef', name: 'Chef', stage: 'config', icon: 'chef', h: 7, sim: 'converge', simCfg: { tool: 'chef-client', mode: 'pull' }, pre: ['linux'],
  pitch: 'La gestion de configuration en Ruby, où l\'infrastructure s\'écrit sous forme de recettes.',
  l: [[
    ['Recettes et ressources', `Une **recipe** Ruby déclare des **ressources** : un paquet, un fichier, un service. Un **cookbook** regroupe recettes, templates et attributs. L'agent \`chef-client\` converge le nœud vers cet état.`, `# cookbooks/web/recipes/default.rb
package 'nginx'

template '/etc/nginx/conf.d/site.conf' do
  source 'site.conf.erb'
  variables(port: node['web']['port'])
  notifies :reload, 'service[nginx]'
end

service 'nginx' do
  action [:enable, :start]
end`, 'ruby'],
  ], [
    ['Serveur, rôles et environnements', `Dans le mode classique, chaque nœud interroge le **Chef Infra Server** et applique son **run-list**. \`knife\` administre le serveur. Les **attributs** fixent les valeurs par nœud, rôle ou environnement. Les **Policyfiles** figent les versions de cookbooks.`, `# Policyfile.rb
name 'web'
default_source :supermarket
run_list 'web::default'
cookbook 'web', path: '.'
default['web']['port'] = 8080

# chef install
# chef push prod Policyfile.lock.json
# knife node list
# knife bootstrap 10.0.0.11 -N web-1 --ssh-user deploy --sudo`, 'ruby'],
  ], [
    ['Tests et conformité', `**Test Kitchen** fait converger un cookbook dans une VM ou un conteneur. **Chef InSpec** décrit des contrôles de conformité, très utilisé pour auditer un serveur, même sans Chef.`, `# InSpec : contrôle de conformité
control 'ssh-01' do
  impact 1.0
  title 'SSH refuse root'
  describe sshd_config do
    its('PermitRootLogin') { should eq 'no' }
  end
end

# kitchen test
# inspec exec profil/ -t ssh://deploy@10.0.0.11`, 'ruby'],
  ]],
  lab: {
    ctx: 'Teste un cookbook localement puis contrôle sa conformité.',
    prompt: 'ops@poste:~/web$',
    steps: [
      ['Génère un cookbook `web`.', '^chef generate cookbook web', 'chef generate cookbook web', 'Your cookbook is ready.'],
      ['Vérifie le style avec Cookstyle.', '^cookstyle', 'cookstyle', '12 files inspected, no offenses detected'],
      ['Lance le cycle de test Test Kitchen.', '^kitchen (test|converge|verify)', 'kitchen test', 'Finished testing <default-ubuntu-2404> (1m42s).'],
      ['Audite le serveur avec InSpec sur `ssh://deploy@10.0.0.11`.', '^inspec exec .*ssh://deploy@10\\.0\\.0\\.11', 'inspec exec profil/ -t ssh://deploy@10.0.0.11', 'Profile Summary: 12 successful controls, 0 control failures'],
    ],
  },
  quiz: [
    ['En quel langage écrit-on les recettes ?', ['Ruby', 'YAML', 'Go', 'HCL'], 0, 'Un DSL Ruby.'],
    ['Comment fonctionne le mode classique ?', ['Les nœuds interrogent le serveur (pull)', 'Le serveur pousse par SSH', 'Par e-mail', 'Par FTP'], 0, 'Le `chef-client` tourne à intervalle régulier.'],
    ['À quoi sert InSpec ?', ['Tester la conformité d\'un système', 'Construire des images', 'Faire du DNS', 'Gérer des pods'], 0, 'Il s\'utilise aussi sans Chef.'],
  ],
  project: {
    t: 'Cookbook web testé',
    b: 'Reproduis le rôle nginx sous forme de cookbook.',
    s: ['Créer le cookbook `web`', 'Ajouter templates et attributs', 'Écrire des tests InSpec', 'Tester avec Test Kitchen', 'Figer les versions avec un Policyfile'],
    d: '`kitchen test` passe du début à la fin sur une image neuve.',
  },
  links: [
    ['Documentation Chef', 'https://docs.chef.io/', 'doc'],
    ['Chef Supermarket', 'https://supermarket.chef.io/', 'doc'],
    ['Chef InSpec', 'https://docs.chef.io/inspec/', 'doc'],
  ],
});

M({
  id: 'puppet', name: 'Puppet', stage: 'config', icon: 'puppet', h: 7, sim: 'converge', simCfg: { tool: 'puppet agent -t', mode: 'pull' }, pre: ['linux'],
  pitch: 'Le pionnier de la gestion de configuration déclarative, très présent dans les grands parcs.',
  l: [[
    ['Manifestes déclaratifs', `Puppet décrit l'état final. Les relations \`require\` et \`notify\` indiquent les dépendances, et Puppet ordonne le reste. L'agent corrige toute dérive toutes les 30 minutes par défaut.`, `class web (Integer $port = 80) {
  package { 'nginx': ensure => installed }

  file { '/etc/nginx/conf.d/site.conf':
    ensure  => file,
    content => epp('web/site.conf.epp', { port => $port }),
    require => Package['nginx'],
    notify  => Service['nginx'],
  }

  service { 'nginx':
    ensure => running,
    enable => true,
  }
}`, 'puppet'],
  ], [
    ['Modules et Hiera', `Un **module** range classes, fichiers et templates. **Hiera** sépare les données du code : les valeurs sont cherchées par hôte, puis par environnement, puis dans les valeurs communes. **Facter** remonte les faits de chaque machine.`, `# hiera.yaml
version: 5
hierarchy:
  - name: Par nœud
    path: "nodes/%{trusted.certname}.yaml"
  - name: Par environnement
    path: "env/%{facts.environment}.yaml"
  - name: Commun
    path: common.yaml

# data/env/prod.yaml
web::port: 8080`, 'yaml'],
  ], [
    ['Tests, r10k et audit', `**rspec-puppet** teste le catalogue compilé et **PDK** structure le développement. **r10k** ou Code Manager déploie les branches Git comme environnements. **PuppetDB** permet d'interroger tout le parc. **Bolt** exécute des tâches ponctuelles sans agent.`, `pdk new module web
pdk validate
pdk test unit

# Essai à blanc sur un nœud
puppet agent -t --noop

# Requête PQL : nœuds sans nginx à jour
puppet query 'resources[certname] { type = "Package" and title = "nginx" }'
bolt command run 'uptime' --targets web-1,web-2`, 'bash'],
  ]],
  lab: {
    ctx: 'Teste un manifeste sur un nœud sans rien casser.',
    prompt: 'root@web-1:~#',
    steps: [
      ['Vérifie la syntaxe de `site.pp`.', '^puppet parser validate site\\.pp', 'puppet parser validate site.pp', ''],
      ['Applique-le à blanc en local.', '^puppet apply .*--noop.*site\\.pp|^puppet apply site\\.pp .*--noop', 'puppet apply --noop site.pp', 'Notice: /Stage[main]/Web/Package[nginx]/ensure: current_value absent, should be present (noop)'],
      ['Applique-le réellement.', '^puppet apply site\\.pp', 'puppet apply site.pp', 'Notice: /Stage[main]/Web/Package[nginx]/ensure: created\nNotice: Applied catalog in 8.41 seconds'],
      ['Déclenche un run de l\'agent en test.', '^puppet agent (-t|--test)', 'puppet agent -t', 'Notice: Applied catalog in 1.12 seconds'],
    ],
  },
  quiz: [
    ['Que fait l\'agent Puppet par défaut ?', ['Il vérifie et corrige toutes les 30 minutes', 'Il s\'exécute une seule fois', 'Il attend Git', 'Il supprime les paquets'], 0, 'La dérive est corrigée automatiquement.'],
    ['À quoi sert Hiera ?', ['Séparer les données du code', 'Compiler Ruby', 'Stocker des images', 'Gérer les certificats web'], 0, 'Une hiérarchie décide quelle valeur s\'applique.'],
    ['Que fait `--noop` ?', ['Il simule sans rien modifier', 'Il arrête l\'agent', 'Il supprime le manifeste', 'Il chiffre tout'], 0, 'L\'équivalent d\'un dry-run.'],
  ],
  project: {
    t: 'Module web testé',
    b: 'Écris un module Puppet complet avec PDK.',
    s: ['Créer le module `web`', 'Paramétrer avec Hiera', 'Écrire des tests rspec-puppet', 'Appliquer en `noop` puis réellement', 'Provoquer une dérive et la voir corrigée'],
    d: 'la modification manuelle d\'un fichier est annulée au run suivant.',
  },
  links: [
    ['Documentation Puppet', 'https://www.puppet.com/docs/', 'doc'],
    ['Puppet Forge', 'https://forge.puppet.com/', 'doc'],
    ['OpenVox, fork communautaire', 'https://voxpupuli.org/openvox/', 'doc'],
  ],
});
