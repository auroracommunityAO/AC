# Atualização dos membros e elementos decorativos

**Data:** 23 de setembro de 2026  
**Repositório:** `auroracommunityAO/AC`

## Alterações realizadas

Foram removidos os dois botões que apareciam imediatamente depois da frase “Um espaço para ideias, palavras e pessoas que acreditam no crescimento com intenção.” na homepage.

Foram removidos os símbolos decorativos usados como setas e estrelas na homepage, na página Coleções, nos cartões públicos e nos estados vazios da Gestão. As ações e ligações continuam funcionais porque apenas o elemento visual foi retirado.

Os cartões dos membros foram compactados sem remover nomes, cargos, descrições ou imagens. Em desktop, os retratos passaram a círculos pequenos dentro de cartões concisos; em ecrãs menores, os cartões adaptam-se para uma composição horizontal com círculos ainda menores.

## Preservação

Foram preservados a navegação, as rotas, a autenticação da Gestão, a sincronização GitHub, os dados das coleções, os assets, os textos dos membros e a responsividade.

## Validação

- Validador estático: passou em 9 rotas HTML.
- `collections.js`: sintaxe validada.
- `gestao.js`: sintaxe validada.
- `git diff --check`: passou.
- Símbolos decorativos públicos removidos.
