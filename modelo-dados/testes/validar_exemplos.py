"""Testes do modelo de dados do Hack_OS (Bolt 0).

1. Os exemplos válidos passam no schema e nas checagens de integridade.
2. Cada caso inválido de exemplos/invalidos/casos.json é recusado pela
   garantia certa (keyword do JSON Schema esperada).
3. A checagem de integridade pega referências quebradas.

Uso:  python modelo-dados/testes/validar_exemplos.py
"""

import copy
import json
import sys
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker

RAIZ = Path(__file__).resolve().parent.parent
EXEMPLOS = RAIZ / "exemplos"

ARQUIVO_PARA_DEF = {
    "squad.json": "squad",
    "mapa.json": "mapa",
    "csd.json": "csd",
    "estacionamento.json": "estacionamento",
    "glossario.json": "glossario",
    "ritual.json": "ritual",
    "pedido-visao.json": "pedido_visao",
    "resposta-visao.json": "resposta_visao",
}


def carregar(caminho):
    with open(caminho, encoding="utf-8") as f:
        return json.load(f)


SCHEMA = carregar(RAIZ / "hackos.schema.json")


def validador(nome_def):
    schema = dict(SCHEMA)
    schema["$ref"] = f"#/$defs/{nome_def}"
    return Draft202012Validator(schema, format_checker=FormatChecker())


def erros_schema(doc, nome_def):
    return sorted(validador(nome_def).iter_errors(doc), key=lambda e: list(e.absolute_path))


def keywords_dos_erros(erros):
    """Inclui as keywords dos sub-erros (anyOf/allOf/if-then escondem a causa real)."""
    encontradas = set()
    pilha = list(erros)
    while pilha:
        e = pilha.pop()
        encontradas.add(e.validator)
        pilha.extend(e.context or [])
    return encontradas


def integridade(docs):
    """Referências entre objetos e entre arquivos que o JSON Schema não checa."""
    problemas = []
    membros = {m["id"] for m in docs["squad"]["membros"]}
    autores_validos = membros | {"agente"}
    mapa = docs["mapa"]
    csd_ids = {i["id"] for i in docs["csd"]["itens"]}

    var_ids = [v["id"] for v in mapa["variaveis"]]
    seta_ids = [s["id"] for s in mapa["setas"]]
    ator_ids = {a["id"] for a in mapa["atores"]}
    for nome, ids in (("variáveis", var_ids), ("setas", seta_ids)):
        if len(ids) != len(set(ids)):
            problemas.append(f"mapa: ids de {nome} repetidos")
    var_ids, seta_ids = set(var_ids), set(seta_ids)
    elementos_mapa = var_ids | seta_ids | ator_ids

    for v in mapa["variaveis"]:
        if v["autor"] not in autores_validos:
            problemas.append(f"{v['id']}: autor {v['autor']} não está no squad")
        for a in v.get("atores", []):
            if a not in ator_ids:
                problemas.append(f"{v['id']}: ator {a} não existe")
    for s in mapa["setas"]:
        for lado in ("de", "para"):
            if s[lado] not in var_ids:
                problemas.append(f"{s['id']}: '{lado}' aponta para {s[lado]}, que não é variável do mapa")
        if s["autor"] not in autores_validos:
            problemas.append(f"{s['id']}: autor {s['autor']} não está no squad")
        if "csd_item" in s and s["csd_item"] not in csd_ids:
            problemas.append(f"{s['id']}: csd_item {s['csd_item']} não existe na CSD")
    for loop in mapa["loops_anotados"]:
        for sid in loop["setas"]:
            if sid not in seta_ids:
                problemas.append(f"loop '{loop['nome']}': seta {sid} não existe")
    for sid in mapa["analise"].get("loop_principal", []):
        if sid not in seta_ids:
            problemas.append(f"análise: loop_principal cita seta {sid}, que não existe")
    cnt = mapa["analise"].get("comportamento_no_tempo")
    if cnt and cnt["variavel"] not in var_ids:
        problemas.append(f"análise: comportamento_no_tempo cita {cnt['variavel']}, que não existe")
    for alv in mapa["alavancas"]:
        alvo_validos = {"variavel": var_ids, "seta": seta_ids, "loop": seta_ids}[alv["alvo"]["tipo"]]
        for r in alv["alvo"]["refs"]:
            if r not in alvo_validos:
                problemas.append(f"{alv['id']}: alvo {r} não existe")
        for c in alv.get("suposicoes", []):
            if c not in csd_ids:
                problemas.append(f"{alv['id']}: suposição {c} não existe na CSD")

    for item in docs["csd"]["itens"]:
        if item["autor"] not in autores_validos:
            problemas.append(f"{item['id']}: autor {item['autor']} não está no squad")
        ref = item["origem"].get("ref")
        if ref and item["origem"]["etapa"] == "mapa_sistemico" and ref not in elementos_mapa:
            problemas.append(f"{item['id']}: origem aponta para {ref}, que não está no mapa")

    ritual = docs["ritual"]
    ref_ids = {r["id"] for r in ritual["reflexoes"]}
    for r in ritual["reflexoes"]:
        if r["autor"] not in membros:
            problemas.append(f"{r['id']}: autor {r['autor']} não está no squad")
    for c in ritual.get("integracao", {}).get("cobertura", []):
        if c["reflexao"] not in ref_ids:
            problemas.append(f"cobertura: reflexão {c['reflexao']} não existe")
        for e in c.get("elementos", []):
            if e not in elementos_mapa:
                problemas.append(f"cobertura de {c['reflexao']}: elemento {e} não está no mapa")

    for item in docs["estacionamento"]["itens"]:
        if item["autor"] not in autores_validos:
            problemas.append(f"{item['id']}: autor {item['autor']} não está no squad")

    if docs["resposta_visao"]["pedido"] != docs["pedido_visao"]["id"]:
        problemas.append("resposta-visao não corresponde ao pedido-visao")
    refs_conhecidas = elementos_mapa | csd_ids | ref_ids
    for v in docs["resposta_visao"]["visoes"]:
        for r in v["refs"]:
            if r not in refs_conhecidas:
                problemas.append(f"{v['id']}: ref {r} não existe")
    return problemas


def aplicar(doc, caso):
    doc = copy.deepcopy(doc)
    *pais, ultima = caso["caminho"]
    alvo = doc
    for chave in pais:
        alvo = alvo[chave]
    if caso.get("remover"):
        del alvo[ultima]
    elif "duplicar_lista" in caso:
        alvo[ultima] = alvo[ultima] * (caso["duplicar_lista"] + 1)
    else:
        alvo[ultima] = caso["valor"]
    return doc


def main():
    falhas = 0

    print("1. Exemplos válidos (lastmile)")
    docs = {}
    for arquivo, nome_def in ARQUIVO_PARA_DEF.items():
        doc = carregar(EXEMPLOS / "lastmile" / arquivo)
        docs[nome_def] = doc
        erros = erros_schema(doc, nome_def)
        if erros:
            falhas += 1
            print(f"   FALHOU {arquivo}:")
            for e in erros[:5]:
                print(f"      {list(e.absolute_path)}: {e.message[:160]}")
        else:
            print(f"   ok     {arquivo}")
    problemas = integridade(docs)
    if problemas:
        falhas += 1
        print("   FALHOU integridade:")
        for p in problemas:
            print(f"      {p}")
    else:
        print("   ok     integridade entre arquivos")

    print("\n2. Casos inválidos (devem ser recusados pela garantia certa)")
    casos = carregar(EXEMPLOS / "invalidos" / "casos.json")["casos"]
    for caso in casos:
        doc = aplicar(carregar(EXEMPLOS / caso["base"]), caso)
        keywords = keywords_dos_erros(erros_schema(doc, caso["def"]))
        if not keywords:
            falhas += 1
            print(f"   FALHOU {caso['nome']}: foi aceito, mas deveria ser recusado")
        elif caso["espera_keyword"] not in keywords:
            falhas += 1
            print(f"   FALHOU {caso['nome']}: recusado por {sorted(keywords)}, esperado {caso['espera_keyword']}")
        else:
            print(f"   ok     {caso['nome']} (recusado por {caso['espera_keyword']})")

    print("\n3. Integridade pega referência quebrada")
    quebrado = copy.deepcopy(docs)
    quebrado["mapa"]["setas"][0]["para"] = "var_inexistente"
    quebrado["mapa"]["variaveis"][0]["autor"] = "mem_desconhecido"
    achados = integridade(quebrado)
    esperados = ["seta_01: 'para' aponta para var_inexistente", "var_contratos: autor mem_desconhecido"]
    for esp in esperados:
        if any(a.startswith(esp) for a in achados):
            print(f"   ok     detectou: {esp}")
        else:
            falhas += 1
            print(f"   FALHOU não detectou: {esp}")

    print(f"\n{'TUDO OK' if not falhas else f'{falhas} FALHA(S)'}")
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
