# Operations — Agente Orquestrador (Cadastro do Time)

## Como rodar o Cadastro do Time

Na raiz do `Hack_OS`:

```bash
python agente-orquestrador/servidor.py [porta]
```

Porta padrão: `8766`. O servidor faz bind em `0.0.0.0` (não só
`127.0.0.1`) e, ao subir, imprime duas URLs:

```
Cadastro do Time em http://127.0.0.1:8766/agente-orquestrador/cadastro/
Na mesma rede: http://<ip-local-da-máquina>:8766/agente-orquestrador/cadastro/
```

O IP da rede é descoberto na hora (`_ip_da_rede_local()`, socket UDP sem
tráfego real) — não precisa configurar nada à mão. Isso foi testado de
verdade: o Lucas cadastrou o squad pelo celular, na mesma Wi-Fi da
máquina rodando o servidor.

Para rodar mais de uma instância ao mesmo tempo (ex.: uma local, uma de
teste), passe portas diferentes — todas leem e gravam o mesmo
`Hack_OS/squad.json`, não há isolamento por porta.

## Onde o dado fica

`Hack_OS/squad.json` — na **raiz do projeto**, não dentro de
`agente-orquestrador/`. Motivo: o squad é um só para a plataforma
inteira (Inception, decisão 1), preenchido uma vez, não por
agente/recorte. Formato: `$defs/squad` de
`../modelo-dados/hackos.schema.json`.

Este arquivo é o contrato que o **Agente de Panorama** lê para calcular
"aderência ao time" no ranqueamento (`membro.areas_afinidade` — nome da
área, nível `experiencia`/`interesse`/`nenhum`, e como a pessoa agrega).
Qualquer mudança no formato de `squad`/`membro` no schema afeta os dois
lados — ver `agente-panorama/01-inception/INCEPTION.md`, Contrato de
saída.

## Como rodar os testes

```bash
cd agente-orquestrador/cadastro && npm test
```

```bash
python -m unittest discover -s agente-orquestrador/testes
```

(o segundo roda da raiz do `Hack_OS`). O primeiro testa a lógica pura do
formulário (`estado.js`, `visao.js`) sem precisar de navegador; o
segundo testa o servidor de verdade — validação contra o schema, ciclo
HTTP completo de salvar/ler, recusa de payload inválido sem gravar nada.

## Como verificar que está saudável

- [ ] `npm test` e os testes Python passam.
- [ ] Servidor sobe e a página responde `200` em
      `/agente-orquestrador/cadastro/`.
- [ ] Cadastrar um integrante, salvar, recarregar a página: os dados
      voltam preenchidos (não é só memória do navegador).
- [ ] Um `nivel` de área de afinidade fora do enum
      (`experiencia`/`interesse`/`nenhum`) é recusado pelo backend (400)
      e **não** é gravado em `squad.json`.
- [ ] Adicionar 2+ integrantes rapidamente (ou tocando duas vezes
      seguidas em "+ Integrante") não cria cartões em branco demais —
      guarda de 400ms contra toque duplo.

## Changelog

- **2026-10-05** — Bolt 1: schema — `membro.areas_afinidade` (lista de
  `{area, nivel, como_agrega}`), exemplo e caso inválido em
  `modelo-dados/`.
- **2026-10-05** — Bolt 2: tela do Cadastro do Time
  (`agente-orquestrador/cadastro/` + `servidor.py`), persistindo em
  `Hack_OS/squad.json`.
- **2026-10-05** — Bolt 2.1: aviso visível quando uma área de afinidade
  fica sem nome (em vez de descartar em silêncio) e nova aba "Visão da
  equipe" somente leitura, com critério de cadastro incompleto (sem
  nome, sem frente marcada, ou sem área com `experiencia`/`interesse`).
- **2026-10-05** — Correção pós-teste real do Lucas (testado pelo
  celular, na rede local): causa raiz era toque duplo no botão "+
  Integrante" sem proteção, criando cartões em branco de aparência
  idêntica. Corrigido com guarda de 400ms, cabeçalho "Integrante N —
  nome" por cartão, contador de integrantes cadastrados, e botão
  remover mais visível.
- Bolts 1, 2 e 2.1 estão em **checkpoint** (implementados e testados,
  aguardando confirmação do Lucas) — ver `02-construction/BOLTS.md`.
