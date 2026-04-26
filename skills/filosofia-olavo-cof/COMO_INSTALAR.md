# Como instalar e usar a skill `filosofia-olavo-cof`

Guia passo a passo para colocar esta habilidade pra funcionar no Claude.

## O que você recebeu

Uma pasta chamada `filosofia-olavo-cof` com esta estrutura:

```
filosofia-olavo-cof/
├── SKILL.md                           ← instruções principais pro Claude
├── COMO_INSTALAR.md                   ← este arquivo
└── referencias/
    ├── estilo-e-linguagem.md          ← como falar (tom, vocabulário, bordões)
    ├── metodologia.md                 ← método pedagógico do curso
    ├── conceitos-chave.md             ← glossário dos termos técnicos
    ├── indice-aulas.md                ← linha de início de cada uma das 472 aulas (versão prévia)
    ├── indice-aulas-completo.md       ← índice completo das 585 aulas (v1)
    ├── indice-tematico.md             ← mapa tema → aulas onde aparecem
    └── como-consultar-corpus.md       ← como buscar trechos literais
```

**Não está junto** (porque é grande): o arquivo `.txt` com todas as aulas (~35 MB). Você mantém esse arquivo separado, no seu computador.

## Instalação — 3 passos

### Passo 1: Copie a pasta para o lugar certo

No Windows, a pasta de habilidades personalizadas do Claude fica em:

```
C:\Users\<seu_usuário>\AppData\Roaming\Claude\local-agent-mode-sessions\skills-plugin\<id-da-sessão>\<id-do-skillset>\skills\
```

**Dica**: no Cowork/Claude Desktop, você pode pedir pro Claude abrir essa pasta no Explorer — basta falar "abra a pasta de skills do usuário". Se ficar difícil localizar, outra forma é:
- Abrir o Cowork
- Abrir a gaveta de skills (em configurações ou na barra lateral)
- Clicar em "Abrir pasta de skills" / "Open skills folder"

Cole a pasta `filosofia-olavo-cof` inteira lá dentro.

### Passo 2: Guarde o corpus (.txt) em lugar estável

Coloque o arquivo `COF_Curso_Online_de_Filosofia_Aulas_1_293_Olavo_de_Carvalho_Z_Library_compressed.txt` em um local fácil de achar no seu computador. Sugestões:

```
C:\Users\<seu_usuário>\Documentos\COF\corpus_cof.txt
```

(pode manter o nome original se preferir — só precisa lembrar onde está)

### Passo 3: Teste

Abra uma nova conversa no Cowork/Claude Desktop e pergunte, por exemplo:

> "Consulta a skill filosofia-olavo-cof e me explica o que é a simples apreensão."

Se a skill foi reconhecida, o Claude vai ler o `SKILL.md` da pasta, seguir as instruções, e responder com o estilo e vocabulário do curso.

Se você quiser busca literal nos trechos (Padrão 1 e 2 do `como-consultar-corpus.md`), aponte o caminho do corpus na primeira mensagem:

> "Meu corpus do COF está em `C:\Users\<seu_usuário>\Documentos\COF\corpus_cof.txt`. Usa a skill filosofia-olavo-cof pra me achar o trecho onde Olavo fala sobre o necrológio."

## Como usar no dia a dia

### 1. Fazer perguntas e receber respostas

> "O que o COF ensina sobre fenomenologia?"
> "Qual a diferença entre signo-parte e signo-pensamento?"
> "Me explica o método de leitura defendido pelo Olavo."

A skill vai ativar, responder com os conceitos corretos, e citar as aulas.

### 2. Buscar trechos específicos

> "Me mostra o trecho em que Olavo critica a USP."
> "Acha a passagem sobre o exercício do necrológio."
> "O que foi dito literalmente sobre Karl Popper?"

Se o corpus estiver acessível, o Claude faz Grep e retorna a citação.

### 3. Gerar conteúdo no estilo

> "Escreve um parágrafo explicando o problema do idealismo cartesiano no estilo do COF."
> "Faz um resumo do que é a unidade do conhecimento, como se fosse uma aula."
> "Redige um texto de 5 parágrafos sobre a amizade filosófica no tom do Olavo."

A skill aplica o vocabulário, as distinções e a estrutura argumentativa típicas do curso.

### 4. Usar o mesmo tipo de linguagem em outras respostas

> "Responde a pergunta X usando a linguagem e os conceitos do COF."

## Ajustes e melhorias

A skill foi montada a partir de amostragem de 5 aulas (01, 50, 100, 200, 401) para destilar estilo e metodologia. Se com o uso você perceber que:

- Algum termo-chave está faltando → adicione em `conceitos-chave.md`
- Algum tema importante não está indexado → adicione em `indice-tematico.md`
- O estilo saiu errado em algum tipo de resposta → ajuste `estilo-e-linguagem.md` com regras mais finas

Basta editar os arquivos com qualquer editor de texto. O Claude relê a skill a cada conversa.

## Problemas comuns

**"A skill não ativa automaticamente"**
→ Mencione o nome da skill explicitamente ("usa a skill filosofia-olavo-cof para...") ou use uma palavra-chave do trigger ("no estilo do COF", "conforme o curso do Olavo").

**"O Claude não acha o corpus"**
→ Informe o caminho exato na primeira mensagem, ou arraste o arquivo .txt direto pro chat (se for uma conversa nova e o Cowork aceitar).

**"As respostas estão soando academicamente demais"**
→ Peça explicitamente "responde como se fosse uma aula, em prosa corrida, sem bullets" — a skill já instrui assim, mas reforçar ajuda nas primeiras vezes.
