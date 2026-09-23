# Instruções do projeto aplicadas ao Aurora Community

**Data:** 23 de setembro de 2026  
**Repositório:** `auroracommunityAO/AC`

## Âmbito

As instruções e documentos partilhados do projeto foram aplicados de forma incremental, preservando os sistemas funcionais existentes, incluindo as páginas públicas, a área de Gestão, a integração com a API do GitHub e as rotas alternativas `/gestao/` e `/gestão/`.

## Alterações realizadas

A navegação superior foi uniformizada em todas as rotas, incluindo as duas variantes da área de Gestão. A estrutura visual da homepage passou a ser reutilizada sem remover a proteção ou a lógica privada da Gestão.

As regras de movimento do projeto foram aplicadas com uma abordagem de produção: foram removidas a animação contínua de atenção e as transições genéricas `transition: all`; os estados interativos usam transições específicas, rápidas e interrompíveis, com uma curva cúbica adequada. Os elementos táteis recebem uma resposta discreta ao pressionar, sem animações decorativas permanentes.

A acessibilidade foi reforçada com foco visível consistente, suporte global para `prefers-reduced-motion`, desativação do efeito decorativo quando o utilizador solicita menos movimento e preservação dos textos alternativos das imagens e dos rótulos de navegação.

A paleta Aurora existente foi mantida e consolidada através do gradiente boreal aplicado às superfícies principais, usando tons de azul-noite, azul-petróleo, turquesa, verde-aurora e violeta.

## Critérios verificados

| Critério | Resultado |
|---|---|
| Páginas HTML públicas e rotas alternativas | Validado |
| Referências locais a CSS, JavaScript e imagens | Validado |
| Textos alternativos das imagens | Validado |
| Rótulos ARIA das navegações | Validado |
| Suporte a `prefers-reduced-motion` | Validado |
| Remoção de animação contínua decorativa | Validado |
| Remoção de `transition: all` | Validado |
| Sintaxe de `collections.js` | Validado |
| Sintaxe de `gestao.js` | Validado |
| Integridade do diff Git | Validado |

A validação foi executada pelo ficheiro [`validate-project-site.py`](./validate-project-site.py), que pode ser reutilizado antes de futuras publicações.

## Princípios aplicados

As decisões seguem a contenção de movimento de Emil Kowalski, o acabamento subtil de produção de Jakub Krehel e a experimentação visual de Jhey Tompkins apenas onde permanece compatível com acessibilidade, desempenho e uso repetido.

> A prioridade foi preservar a funcionalidade e tornar a experiência mais consistente, acessível e previsível, em vez de adicionar movimento apenas por decoração.
