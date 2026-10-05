"""Valida a resposta do motor do agente contra o pedido que a originou.

Além do schema `resposta_visao`, confere o que o schema não alcança:
- a resposta é deste pedido e respeita o limite de visões;
- toda referência aponta para algo que existe no pedido (mapa, CSD, ritual);
- conexão sugerida liga duas variáveis do mapa e não repete uma seta igual;
- nenhuma visão repete uma visão ainda aberta nem uma ideia já estacionada;
- nenhum texto descreve uma solução de produto (a fronteira do Inception:
  o agente diz onde intervir, nunca o que construir);
- a visão é legível para o squad (Bolt 6): sem ids técnicos no texto, uma
  só pergunta, texto curto, poucas referências;
- a fonte teórica vem do catálogo das aulas (fontes-teoricas.json) e
  combina com o tipo da visão, salvo quando marcada como suplementar.

Uso:  python modelo-dados/validar_resposta.py <resposta.json> <pedido.json>
Sai com código 1 e lista os problemas quando a resposta não pode ser usada.
"""

import json
import re
import sys
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker

AQUI = Path(__file__).resolve().parent
SCHEMA = json.loads((AQUI / "hackos.schema.json").read_text(encoding="utf-8"))
FONTES = json.loads((AQUI / "fontes-teoricas.json").read_text(encoding="utf-8"))["fontes"]

# Legibilidade (Bolt 6): achados das primeiras execuções reais do agente.
LIMITE_TEXTO = 450
LIMITE_PERGUNTA = 240
LIMITE_REFS = 4
ID_TECNICO = re.compile(r"\b(?:var|seta|ator|alv|csd|ref|rit|est|glo|vis|ped|rec)_[a-z0-9][a-z0-9_-]*\b")

# Frases típicas de quem está propondo produto em vez de perguntar.
LINGUAGEM_DE_SOLUCAO = [
    r"\bvoc[eê]s (deveriam|devem|precisam) (criar|construir|desenvolver|fazer|lan[cç]ar)\b",
    r"\b(criar|construir|desenvolver|lan[cç]ar|implementar) (um|uma) (app|aplicativo|plataforma|chatbot|dashboard|painel|site|sistema|bot|ferramenta)\b",
    r"\ba solu[cç][aã]o (seria|[eé])\b",
    r"\buma boa solu[cç][aã]o\b",
    r"\bsugerimos (criar|construir|desenvolver)\b",
]


def erros_de_schema(doc, nome_def):
    schema = dict(SCHEMA)
    schema["$ref"] = f"#/$defs/{nome_def}"
    validador = Draft202012Validator(schema, format_checker=FormatChecker())
    return [f"schema: {'/'.join(map(str, e.absolute_path)) or '(raiz)'}: {e.message[:200]}" for e in validador.iter_errors(doc)]


def textos_da_visao(v):
    yield v.get("texto", "")
    yield v.get("pergunta", "")
    if "proposta_seta" in v:
        yield v["proposta_seta"].get("mecanismo", "")


def fonte_do_catalogo(referencia):
    ref = referencia.strip().lower()
    for fonte in FONTES:
        rotulo = fonte["rotulo"].lower()
        if ref == rotulo or ref.startswith(rotulo + ":"):
            return fonte
    return None


def problemas_de_legibilidade(v, prefixo):
    lista = []
    for campo in ("texto", "pergunta"):
        achado = ID_TECNICO.search(v[campo])
        if achado:
            lista.append(f"{prefixo}: o {campo} mostra o id técnico \"{achado.group(0)}\"; use o nome do elemento (ids só em refs)")
    if "proposta_seta" in v and ID_TECNICO.search(v["proposta_seta"]["mecanismo"]):
        lista.append(f"{prefixo}: o mecanismo da seta proposta mostra id técnico; use nomes")
    if v["pergunta"].count("?") != 1:
        lista.append(f"{prefixo}: a pergunta tem {v['pergunta'].count('?')} interrogações; faça uma pergunta só")
    if len(v["texto"]) > LIMITE_TEXTO:
        lista.append(f"{prefixo}: texto com {len(v['texto'])} caracteres, acima de {LIMITE_TEXTO}")
    if len(v["pergunta"]) > LIMITE_PERGUNTA:
        lista.append(f"{prefixo}: pergunta com {len(v['pergunta'])} caracteres, acima de {LIMITE_PERGUNTA}")
    if len(v["refs"]) > LIMITE_REFS:
        lista.append(f"{prefixo}: {len(v['refs'])} refs, acima de {LIMITE_REFS}; cite só as essenciais")
    fonte = v["fonte_teorica"]
    if not fonte["suplementar"]:
        do_catalogo = fonte_do_catalogo(fonte["referencia"])
        if not do_catalogo:
            lista.append(f"{prefixo}: fonte \"{fonte['referencia']}\" não está no catálogo das aulas (fontes-teoricas.json)")
        elif v["tipo"] not in do_catalogo["tipos"]:
            lista.append(f"{prefixo}: a fonte \"{do_catalogo['rotulo']}\" não combina com uma visão do tipo {v['tipo']}")
    return lista


def tem_linguagem_de_solucao(texto):
    for padrao in LINGUAGEM_DE_SOLUCAO:
        achado = re.search(padrao, texto, flags=re.IGNORECASE)
        if achado:
            return achado.group(0)
    return None


def problemas_da_entrevista(resposta, pedido):
    """Entrevista em rodadas (Bolt 7)."""
    lista = []
    rodada = resposta.get("entrevista")
    if resposta.get("informacao_insuficiente") and not rodada and not resposta.get("proposta_contexto"):
        lista.append("informação insuficiente sem rodada de entrevista: devolva perguntas para o squad recortar o problema")
    if resposta.get("informacao_insuficiente") and len(resposta["visoes"]) > 1:
        lista.append("com informação insuficiente, no máximo 1 visão (as perguntas vão na entrevista)")
    if rodada:
        anteriores = pedido.get("entrevista", {}).get("rodadas", [])
        esperada = len(anteriores) + 1
        if rodada["rodada"] != esperada:
            lista.append(f"entrevista: rodada {rodada['rodada']}, mas a próxima é a {esperada}")
        ids = [p["id"] for p in rodada["perguntas"]]
        if len(ids) != len(set(ids)):
            lista.append("entrevista: ids de pergunta repetidos")
        ja_usados = {p["id"] for r in anteriores for p in r.get("perguntas", [])}
        for p in rodada["perguntas"]:
            prefixo = f"entrevista {p['id']}"
            if p["id"] in ja_usados:
                lista.append(f"{prefixo}: id já usado numa rodada anterior")
            if p["pergunta"].count("?") != 1:
                lista.append(f"{prefixo}: faça uma pergunta só")
            if len(p["pergunta"]) > LIMITE_PERGUNTA:
                lista.append(f"{prefixo}: pergunta com {len(p['pergunta'])} caracteres, acima de {LIMITE_PERGUNTA}")
            for texto in [p["pergunta"], *p.get("opcoes", [])]:
                if ID_TECNICO.search(texto):
                    lista.append(f"{prefixo}: mostra id técnico; use nomes")
                achado = tem_linguagem_de_solucao(texto)
                if achado:
                    lista.append(f"{prefixo}: pergunta ou opção descreve solução de produto (\"{achado}\")")
    proposta = resposta.get("proposta_contexto")
    if proposta:
        for campo, texto in proposta.items():
            achado = tem_linguagem_de_solucao(texto)
            if achado:
                lista.append(f"proposta_contexto.{campo}: descreve solução de produto (\"{achado}\")")
            if ID_TECNICO.search(texto):
                lista.append(f"proposta_contexto.{campo}: mostra id técnico; use nomes")
        if proposta["pergunta_problema"].count("?") != 1:
            lista.append("proposta_contexto.pergunta_problema: precisa ser uma única pergunta")
    return lista


def problemas(resposta, pedido):
    lista = erros_de_schema(resposta, "resposta_visao")
    if lista:
        return lista  # o resto depende da estrutura estar certa

    if resposta["pedido"] != pedido["id"]:
        lista.append(f"a resposta é do pedido {resposta['pedido']}, mas o pedido atual é {pedido['id']}")
    if len(resposta["visoes"]) > pedido["limite_visoes"]:
        lista.append(f"{len(resposta['visoes'])} visões, acima do limite de {pedido['limite_visoes']}")

    mapa = pedido["mapa"]
    variaveis = {v["id"] for v in mapa["variaveis"]}
    conhecidos = (
        variaveis
        | {s["id"] for s in mapa["setas"]}
        | {a["id"] for a in mapa["atores"]}
        | {a["id"] for a in mapa["alavancas"]}
        | {i["id"] for i in pedido.get("csd", {}).get("itens", [])}
        | {r["id"] for r in pedido.get("ritual", {}).get("reflexoes", [])}
    )
    setas_existentes = {(s["de"], s["para"], s["polaridade"]) for s in mapa["setas"]}
    abertas = pedido.get("visoes_abertas", [])
    ids_abertos = {v["id"] for v in abertas}
    perguntas_abertas = {v["pergunta"].strip().lower() for v in abertas}
    ja_estacionadas = {i["texto"].strip().lower() for i in pedido.get("estacionamento", {}).get("itens", [])}

    ids = [v["id"] for v in resposta["visoes"]]
    if len(ids) != len(set(ids)):
        lista.append("ids de visão repetidos")

    for v in resposta["visoes"]:
        prefixo = f"{v['id']} ({v['tipo']})"
        if v["id"] in ids_abertos:
            lista.append(f"{prefixo}: id já usado por uma visão aberta")
        if v["pergunta"].strip().lower() in perguntas_abertas:
            lista.append(f"{prefixo}: repete a pergunta de uma visão ainda aberta")
        for ref in v["refs"]:
            if ref not in conhecidos:
                lista.append(f"{prefixo}: ref {ref} não existe no pedido")
        proposta = v.get("proposta_seta")
        if proposta:
            for lado in ("de", "para"):
                if proposta[lado] not in variaveis:
                    lista.append(f"{prefixo}: proposta_seta.{lado} = {proposta[lado]} não é variável do mapa")
            if proposta["de"] == proposta["para"]:
                lista.append(f"{prefixo}: a seta proposta liga a variável a ela mesma")
            if (proposta["de"], proposta["para"], proposta["polaridade"]) in setas_existentes:
                lista.append(f"{prefixo}: a seta proposta já existe no mapa")
        if v.get("texto_estacionado", "").strip().lower() in ja_estacionadas:
            lista.append(f"{prefixo}: essa ideia já está no estacionamento")
        lista.extend(problemas_de_legibilidade(v, prefixo))
        for texto in textos_da_visao(v):
            for padrao in LINGUAGEM_DE_SOLUCAO:
                achado = re.search(padrao, texto, flags=re.IGNORECASE)
                if achado:
                    lista.append(f"{prefixo}: texto descreve solução de produto (\"{achado.group(0)}\"); diga onde intervir, não o que construir")
    lista.extend(problemas_da_entrevista(resposta, pedido))
    return lista


def main(argv):
    if len(argv) != 3:
        print(__doc__)
        return 2
    resposta = json.loads(Path(argv[1]).read_text(encoding="utf-8"))
    pedido = json.loads(Path(argv[2]).read_text(encoding="utf-8"))
    achados = problemas(resposta, pedido)
    if achados:
        print("RESPOSTA RECUSADA")
        for p in achados:
            print(f"- {p}")
        return 1
    print(f"Resposta válida: {len(resposta['visoes'])} visão(ões) para o pedido {pedido['id']}.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
