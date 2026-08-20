# Gestão Aurora no GitHub Pages

A área `/gestão` funciona como uma página estática e comunica directamente com a API REST do GitHub. Não depende de Vercel, funções Node ou variáveis de ambiente.

O token de granularidade fina é pedido no formulário de entrada e permanece apenas em memória enquanto a página estiver aberta. Não é colocado no código, no URL, no `localStorage` ou em ficheiros do repositório. Ao fechar ou recarregar a página, o token deixa de estar disponível.

Para o repositório `auroracommunityAO/AC`, configure o token GitHub com acesso apenas a esse repositório e estas permissões:

| Permissão | Valor | Utilização |
|---|---|---|
| Metadata | Read-only | Confirmar que o repositório existe e que o token tem acesso |
| Contents | Read and write | Listar, ler, criar e actualizar ficheiros |

A Gestão apresenta uma mensagem específica para token inválido, repositório inacessível, falta de permissão de escrita ou branch incorrecta. O botão **Testar e entrar** confirma primeiro o repositório e a capacidade de escrita antes de abrir o painel.

Depois de entrar, é possível listar e abrir ficheiros remotos, editar texto, carregar ficheiros locais, gerar o índice JSON das colecções, descarregar ficheiros e criar ou actualizar ficheiros no GitHub através de commits.

As colecções são sincronizadas no ficheiro público `content/colecoes.json`. Ao criar, editar, publicar, arquivar, eliminar ou importar uma coleção, a Gestão actualiza esse ficheiro através de um commit. A página `collections.html` lê o ficheiro público directamente no GitHub Pages com cache-busting, pelo que a mesma informação fica disponível para todos os utilizadores e navegadores depois da propagação do deployment.

A API GitHub de Contents requer o `sha` actual quando um ficheiro existente é actualizado. A Gestão carrega esse valor automaticamente e avisa se houver conflito ou alteração concorrente.

Referências oficiais:

- https://docs.github.com/rest/repos/contents
- https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens
