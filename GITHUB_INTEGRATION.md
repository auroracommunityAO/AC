# Integração GitHub da Gestão

A área Gestão comunica com a API REST de Contents do GitHub através de um endpoint de servidor. O token GitHub nunca deve ser colocado no HTML, no JavaScript público, no URL ou no armazenamento local.

Para o repositório `auroracommunityAO/AC`, o token de granularidade fina deve estar limitado a esse repositório e ter pelo menos `Metadata: Read-only` e `Contents: Read and write`. A leitura de ficheiros usa `GET /repos/{owner}/{repo}/contents/{path}` e a criação/actualização usa `PUT /repos/{owner}/{repo}/contents/{path}` com `content` em Base64, `branch` e, ao actualizar um ficheiro existente, o respectivo `sha`. A eliminação usa `DELETE` com `sha` e mensagem de commit.

A configuração esperada no serviço de servidor é:

```text
GESTAO_TOKEN=token usado para abrir a área Gestão
GITHUB_TOKEN=token GitHub de granularidade fina
GITHUB_OWNER=auroracommunityAO
GITHUB_REPO=AC
GITHUB_BRANCH=main
```

Referências oficiais:

- https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens
- https://docs.github.com/rest/repos/contents
