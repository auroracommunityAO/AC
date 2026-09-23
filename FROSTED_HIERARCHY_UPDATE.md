# Atualização visual Frosted, Clear e Blur

**Data:** 23 de setembro de 2026  
**Repositório:** `auroracommunityAO/AC`

## Objetivo

Aplicar os conceitos visuais das referências fornecidas sem redesenhar o site nem alterar o que já estava funcional.

## Alterações

A intervenção ficou limitada ao `style.css`. A barra superior recebeu um acabamento translúcido com blur e contraste preservado. Cartões, áreas de gestão, campos de trabalho e modais passaram a usar superfícies de vidro discretas, com bordas e sombras para separar claramente os níveis de informação.

A hierarquia foi reforçada com títulos equilibrados, metadados mais evidentes, descrições limitadas a uma largura confortável de leitura e contraste explícito na secção clara de liderança. Não foram alterados HTML, JavaScript, dados, rotas, autenticação, integração GitHub, dimensões das imagens ou grelhas das coleções.

## Conceitos aplicados

| Conceito | Aplicação |
|---|---|
| Frosted | Cabeçalho translúcido com blur, saturação e borda luminosa |
| Clear | Superfícies com fallback sólido quando o navegador não suporta blur |
| Blur | Desfoque aplicado de forma contida a superfícies, sem prejudicar leitura |
| Hierarquia visual | Pesos, largura de leitura, títulos equilibrados e metadados destacados |
| Contraste | Texto escuro reforçado nas superfícies claras e estados de foco preservados |

## Preservação

A alteração não removeu nem reescreveu sistemas funcionais. Foram preservadas páginas, conteúdo, coleções, gestão, aliases `/gestao/` e `/gestão/`, scripts, autenticação, dados e assets existentes.

## Validação

- Validador estático: passou em 9 rotas HTML.
- `collections.js`: sintaxe validada.
- `gestao.js`: sintaxe validada.
- `git diff --check`: passou.
- Alteração de ficheiros: apenas CSS e este relatório Markdown.
- Movimento reduzido: mantido e respeitado.
