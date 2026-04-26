# filosofia-olavo-cof

Habilidade (skill) para Claude Code / Claude Desktop / Cowork baseada nas transcrições do **Curso Online de Filosofia (COF)** de Olavo de Carvalho.

## O que esta skill faz

Quando instalada, ela ensina o Claude a:

- Responder perguntas sobre filosofia usando o vocabulário e a metodologia do COF (simples apreensão, forma substancial, signo-parte vs. signo-pensamento, zetético, "às coisas mesmas" etc.).
- Buscar trechos literais nas 585 aulas do curso (quando o corpus em `.txt` está disponível no computador).
- Gerar conteúdo (artigos, explicações, resumos) no estilo argumentativo característico do curso.
- Citar aulas específicas como base das respostas.

## Conteúdo do pacote

```
filosofia-olavo-cof/
├── SKILL.md                              ← instruções principais pro Claude
├── README.md                             ← este arquivo
├── COMO_INSTALAR.md                      ← passo a passo de instalação
└── referencias/
    ├── estilo-e-linguagem.md             ← tom, vocabulário, estrutura argumentativa
    ├── metodologia.md                    ← método pedagógico do curso
    ├── conceitos-chave.md                ← glossário dos termos técnicos
    ├── indice-aulas.md                   ← linha de início de cada aula no corpus (versão prévia)
    ├── indice-aulas-completo.md          ← índice completo das 585 aulas (em construção — v1)
    ├── indice-tematico.md                ← mapa tema → aulas onde aparecem
    └── como-consultar-corpus.md          ← como buscar trechos literais
```

## O que NÃO está incluído (e por quê)

O arquivo `.txt` com a transcrição integral das 585 aulas (~35 MB) **não vem junto** com a skill. Ele tem direito autoral e cada usuário precisa providenciar o seu próprio. A skill funciona sem o corpus — apenas perde a capacidade de busca literal por trechos. Com o corpus instalado, ganha-se essa capacidade.

## Como instalar

Veja o passo a passo no arquivo [`COMO_INSTALAR.md`](COMO_INSTALAR.md). Resumo:

1. Copiar a pasta `filosofia-olavo-cof/` para o diretório de skills do Claude.
2. (Opcional) Salvar o corpus `.txt` num caminho fixo no computador.
3. Em qualquer conversa nova, perguntar: *"Usa a skill filosofia-olavo-cof para..."*

## Status atual

- **Estilo, metodologia, conceitos**: completos e prontos pra uso.
- **Índice das aulas**: v1 — 35 aulas (1 a 35) com data e resumo extraídos por leitura direta do corpus, mais 4 aulas confirmadas por amostragem (50, 100, 200, 401). As demais ~547 aulas têm apenas o número e a linha inicial mapeados; resumos serão preenchidos progressivamente.

## Aviso

Este material foi gerado por processamento automático de transcrições não oficiais do COF. Os resumos e mapeamentos podem conter erros e não substituem o curso original. Use como ferramenta de referência e estudo, não como fonte definitiva.

## Licença / atribuição

O conteúdo intelectual original do COF é de autoria de **Olavo de Carvalho** (1947–2022). Esta skill é apenas uma estrutura de organização e consulta sobre transcrições já existentes — não inclui o material original e não pretende substituí-lo.
