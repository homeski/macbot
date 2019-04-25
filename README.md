# macbot

**required vars:**

```yml
macbot.groupme_access_token: ''
macbot.bots: []
macbot.matches: {}
macbot.listen: ''
macbot.port: ''
```

**run:**

```sh
ansible-playbook -i ../ansible-inventory/hosts-<env> pb-run-macbot.yml
```
