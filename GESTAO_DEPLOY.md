# Servidor privado da Gestão Aurora

A Gestão passou a ter duas credenciais com funções diferentes. O `GESTAO_TOKEN` permite abrir o painel; o `GITHUB_TOKEN` é usado exclusivamente pelo servidor para comunicar com o repositório `auroracommunityAO/AC`. O segundo token nunca é enviado para o navegador.

## Configuração do token GitHub

No GitHub, crie um token de granularidade fina com acesso apenas ao repositório `auroracommunityAO/AC`. Em **Repository permissions**, atribua:

| Permissão | Valor | Motivo |
|---|---|---|
| Metadata | Read-only | Identificar o repositório através da API |
| Contents | Read and write | Ler, criar e actualizar ficheiros |

Se o token só tiver `Contents: Read-only`, a leitura pode funcionar, mas o envio de ficheiros será recusado. Se o repositório pertencer a uma organização com aprovação obrigatória, o token também precisa de ser aprovado pela organização.

## Variáveis do servidor

Configure estes valores como segredos no serviço onde executar o servidor. Não os coloque no HTML, no JavaScript, no GitHub ou no URL.

```text
GESTAO_TOKEN=um-token-longo-para-entrar-na-Gestao
GITHUB_TOKEN=o-token-de-granularidade-fina-do-GitHub
GITHUB_OWNER=auroracommunityAO
GITHUB_REPO=AC
GITHUB_BRANCH=main
PORT=4173
```

## Execução

O projecto já inclui um servidor Node independente:

```bash
npm start
```

A página pública e a Gestão ficam no mesmo domínio. A área privada é `/gestão`, a autenticação é `/api/gestao-auth` e a ponte GitHub é `/api/gestao-files`.

## Funcionalidades disponíveis

Depois de entrar na Gestão, pode listar ficheiros do repositório, abrir um ficheiro remoto, editar o conteúdo, carregar um ficheiro de texto local, gerar o índice JSON das colecções, descarregar um rascunho e criar ou actualizar um ficheiro através de um commit no GitHub.

A API limita os ficheiros a 1 MB, recusa caminhos com `..` ou `.git/`, usa o `sha` remoto ao actualizar ficheiros e não guarda o token no `localStorage`.

## Diagnóstico de erro do token

A mensagem `A integração GitHub ainda não está configurada no servidor` significa que faltam `GITHUB_TOKEN`, `GITHUB_OWNER` ou `GITHUB_REPO` no serviço. A mensagem `GitHub recusou o token` normalmente significa que o token expirou, está limitado a outro repositório, pertence a outra conta, aguarda aprovação da organização ou não tem `Contents: Read and write`.
