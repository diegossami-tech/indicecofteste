# Como consultar o corpus do COF

Este documento explica a mecânica técnica de consultar o arquivo de texto integral do curso (~440 mil linhas, ~35 MB) usando ferramentas Read/Grep.

## Pré-requisito: localizar o corpus

O corpus completo **não está empacotado dentro do skill** (seria pesado demais). O usuário mantém o arquivo em seu computador. O nome típico:

```
COF_Curso_Online_de_Filosofia_Aulas_1_293_Olavo_de_Carvalho_Z_Library_compressed.txt
```

Antes de fazer qualquer busca literal:

1. **Pergunte ao usuário onde está o arquivo** se ele não tiver mencionado, ou
2. **Verifique automaticamente** as pastas usuais (Downloads, Documentos, área de trabalho, ou a pasta de trabalho atual da sessão), ou
3. **Solicite o upload** do arquivo na conversa, se a sessão não tiver acesso a pastas locais.

Se o corpus não estiver acessível, **avise** o usuário e responda apenas com base nos resumos e índices já presentes no skill (`conceitos-chave.md`, `indice-tematico.md`).

## Padrão 1 — Localizar trecho específico (busca literal)

Quando o usuário pede "me acha o trecho onde Olavo fala de X":

1. **Grep** no corpus por uma palavra-chave característica:
   ```
   pattern: "necrológio"
   path: <caminho do corpus>
   output_mode: "content"
   -n: true
   -B: 2
   -A: 10
   ```
2. Avalie os resultados (números de linha indicam onde estão).
3. **Read** com offset/limit para capturar o contexto completo:
   ```
   offset: <linha_resultado - 5>
   limit: 80
   ```
4. Cite o trecho entre aspas, identifique a aula consultando `indice-aulas.md`.

## Padrão 2 — Consultar conteúdo de uma aula específica

Quando o usuário pede "me resume a Aula 200" ou "o que tem na Aula 50":

1. Em `indice-aulas.md`, localize a linha de início da aula.
2. Estime o tamanho da aula olhando a linha da aula seguinte (subtração).
3. **Read** com offset = linha de início da aula e limit ≈ tamanho calculado (ou 1000-1500 linhas para aulas longas).
4. Resuma respeitando o estilo (`estilo-e-linguagem.md`) e os conceitos (`conceitos-chave.md`).

## Padrão 3 — Pergunta temática ampla

Quando o usuário pergunta "o que Olavo ensina sobre X?":

1. Consulte `indice-tematico.md` para o tema X.
2. Identifique 2-4 aulas onde o tema aparece.
3. Faça **Read** das passagens relevantes (300-500 linhas cada).
4. Sintetize a posição do curso em prosa, citando as aulas.
5. Não invente — se o tema não estiver coberto pelos índices, faça **Grep** amplo por palavras-chave do tema; se ainda não achar, diga que o curso não trata explicitamente.

## Padrão 4 — Geração no estilo

Quando o usuário pede "escreve um texto/explicação sobre X no estilo do COF":

1. Leia `estilo-e-linguagem.md` integralmente.
2. Leia `conceitos-chave.md` para os termos técnicos relevantes ao tema.
3. (Opcional, se acessível) faça uma consulta breve ao corpus para capturar 1-2 expressões típicas usadas pelo Olavo sobre o tema.
4. Escreva a resposta seguindo a estrutura argumentativa de 6 passos descrita em `metodologia.md` seção 4.
5. Aplique o teste de aderência da seção 9 de `estilo-e-linguagem.md` antes de entregar.

## Cuidados ao citar

- **Sempre identifique a aula** ao citar trecho literal (ex: "Conforme a Aula 401 do COF, (...)").
- **Cite entre aspas** quando reproduzir frase literal — paráfrase fica no texto comum.
- **Não fabrique citações**. Se não conseguir localizar a passagem exata, parafraseie e indique que a posição é "atribuível ao curso" sem aspas.
- **Quando duas aulas dizem coisas diferentes** sobre o mesmo tema, mencione a diferença em vez de escolher uma.

## Limitações conhecidas do corpus

- Há erros de OCR/digitação (numeração de aulas, datas, palavras esparsas). Veja gaps em `indice-aulas.md`.
- Algumas aulas não têm cabeçalho automaticamente detectável — para encontrá-las, use Grep por tema/data esperada.
- Cabeçalhos de página (rodapés, números de página, "[versão provisória]") aparecem como ruído — ignore na hora de citar.
- Marcadores como "[parte 2: COF...]" indicam quebra de gravação — não são parte do conteúdo filosófico.
