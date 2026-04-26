# Projeto Filosofia Olavo COF

Este repositório organiza a skill `filosofia-olavo-cof` como um projeto de trabalho contínuo.

O material original foi importado para `skills/filosofia-olavo-cof/` e mantido separado da camada de projeto. Assim, podemos evoluir documentação, scripts e processo sem descaracterizar o pacote-base.

## Estrutura

```text
projeto-filosofia-olavo-cof/
|-- docs/
|-- scripts/
|-- skills/
|   `-- filosofia-olavo-cof/
`-- README.md
```

## Objetivo

Este projeto serve para:

- manter a skill versionada;
- empacotar a skill com um comando previsível;
- validar rapidamente se a estrutura mínima está íntegra;
- preparar futuras melhorias de conteúdo, índice e instalação.

## Como trabalhar

### 1. Validar a estrutura

No PowerShell, dentro desta pasta:

```powershell
.\scripts\validate-skill.ps1
```

### 2. Validar o corpus local

O corpus completo fica fora do pacote da skill. Neste projeto, o caminho local fica em `config/corpus.local.json`.

Para verificar se o arquivo esta acessivel:

```powershell
.\scripts\validate-corpus.ps1
```

### 3. Pesquisar no corpus

```powershell
.\scripts\search-corpus.ps1 -Pattern "necrologio"
```

Voce tambem pode ajustar contexto e quantidade de resultados:

```powershell
.\scripts\search-corpus.ps1 -Pattern "simples apreensao" -Before 2 -After 10 -MaxResults 3
```

### 4. Gerar o zip da skill

```powershell
.\scripts\package-skill.ps1
```

O arquivo será salvo em `dist/filosofia-olavo-cof.zip`.

### 5. Abrir a pagina web local

```powershell
.\scripts\start-web.ps1
```

Depois abra:

`http://127.0.0.1:4173`

Recursos da interface:

- busca textual com contexto;
- abertura de aula por numero;
- leitura por faixa de linhas.

## Publicar no GitHub e no Render

### GitHub

Este projeto ja esta pronto para ser versionado, mas eu nao consegui enviar por voce porque esta maquina nao tem GitHub CLI nem autenticacao configurada.

Quando voce tiver criado um repositorio vazio no GitHub, rode:

```powershell
git add .
git commit -m "Projeto inicial COF"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPO.git
git push -u origin main
```

### Render

O projeto agora tem:

- `package.json` com `npm start`
- `render.yaml`
- suporte a host externo em `web/server.js`

Para funcionar fora da sua maquina, voce ainda precisa definir a variavel `COF_CORPUS_PATH` no painel da Render apontando para o corpus que sera disponibilizado no servidor.

### Link do indice

O servidor aceita um caminho amigavel para o indice:

- local: `http://127.0.0.1:4173/indicecofteste`

Se voce publicar esse projeto em uma hospedagem, o caminho equivalente tambem vai abrir o indice nessa URL publicada.

## Próximos passos sugeridos

- revisar encoding dos arquivos Markdown e HTML;
- completar os resumos pendentes do índice mestre;
- padronizar instruções de instalação para o ambiente-alvo;
- adicionar um changelog do conteúdo da skill.

## Origem do material

O pacote importado veio de:

`C:\Users\pc\Desktop\Olavo teste`
