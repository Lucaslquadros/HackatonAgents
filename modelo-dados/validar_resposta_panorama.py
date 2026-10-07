"""Valida a resposta do motor do Agente de Panorama (Bolt 6) contra o
pedido que a originou.

Além do schema `resposta_panorama`, confere o que o schema não alcança:
- a resposta é deste pedido;
- nenhum fato sugerido repete (por texto) um fato já existente no pedido;
- nenhum texto descreve solução de produto (mesma fronteira dos outros
  agentes: dizem o que observam, nunca o que construir);
- nenhum fato é, na prática, uma pergunta-problema ou hipótese disfarçada
  de fato (Bolt 6 só propõe fatos — problema/hipótese são trabalho do
  squad nos Bolts 2-5, não deste motor);
- toda evidência tem descrição não vazia (schema já garante minLength,
  aqui confere que não é só espaço em branco).

Uso:  python modelo-dados/validar_resposta_panorama.py <resposta.json> <pedido.json>
Sai com código 1 e lista os problemas quando a resposta não pode ser usada.
"""

import json
import re
import sys
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker

AQUI = Path(__file__).resolve().parent
SCHEMA = json.loads((AQUI / "hackos.schema.json").read_text(encoding="utf-8"))

sys.path.insert(0, str(AQUI))
from validar_resposta import LINGUAGEM_DE_SOLUCAO, ID_TECNICO  # noqa: E402

# Fatos são afirmações, não perguntas nem hipóteses de solução — pegam o
# que escapa de LINGUAGEM_DE_SOLUCAO (que mira "construir X") mas ainda
# assim soa como enunciado de problema ou hipótese de intervenção.
LINGUAGEM_DE_PROBLEMA_OU_HIPOTESE = [
    r"\bpor que\b.{0,80}\bapesar\b",
    r"\bhip[oó]tese\s*:",
    r"\back[eê]mos que a solu[cç][aã]o\b",
    r"\brecomendamos\b",
    r"\bo ideal seria\b",
    r"\bdeveriam?\b",
]


def erros_de_schema(doc, nome_def):
    schema = dict(SCHEMA)
    schema["$ref"] = f"#/$defs/{nome_def}"
    validador = Draft202012Validator(schema, format_checker=FormatChecker())
    return [f"schema: {'/'.join(map(str, e.absolute_path)) or '(raiz)'}: {e.message[:200]}" for e in validador.iter_errors(doc)]


def tem_padrao(texto, padroes):
    for padrao in padroes:
        achado = re.search(padrao, texto, flags=re.IGNORECASE)
        if achado:
            return achado.group(0)
    return None


def problemas(resposta, pedido):
    lista = erros_de_schema(resposta, "resposta_panorama")
    if lista:
        return lista  # o resto depende da estrutura estar certa

    if resposta["pedido"] != pedido["id"]:
        lista.append(f"a resposta é do pedido {resposta['pedido']}, mas o pedido atual é {pedido['id']}")

    textos_existentes = {f["texto"].strip().lower() for f in pedido.get("fatos_existentes", [])}

    for i, f in enumerate(resposta["fatos_sugeridos"]):
        prefixo = f"fato sugerido #{i + 1}"
        texto = f["texto"]
        if texto.strip().lower() in textos_existentes:
            lista.append(f"{prefixo}: repete um fato que já existe no cenário")
        if ID_TECNICO.search(texto):
            lista.append(f"{prefixo}: mostra id técnico no texto")
        if not f["evidencia"]["descricao"].strip():
            lista.append(f"{prefixo}: evidência sem descrição de verdade (só espaço em branco)")
        achado_solucao = tem_padrao(texto, LINGUAGEM_DE_SOLUCAO)
        if achado_solucao:
            lista.append(f"{prefixo}: descreve solução de produto (\"{achado_solucao}\"); um fato observa, não propõe")
        achado_problema = tem_padrao(texto, LINGUAGEM_DE_PROBLEMA_OU_HIPOTESE)
        if achado_problema:
            lista.append(f"{prefixo}: soa como pergunta-problema ou hipótese (\"{achado_problema}\"), não um fato — isso é trabalho do squad, não deste motor")
        if texto.strip().endswith("?"):
            lista.append(f"{prefixo}: termina em interrogação — um fato é uma afirmação, não uma pergunta")

    for i, texto in enumerate(resposta.get("lacunas", [])):
        achado = tem_padrao(texto, LINGUAGEM_DE_SOLUCAO)
        if achado:
            lista.append(f"lacuna #{i + 1}: descreve solução de produto (\"{achado}\")")

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
    print(f"Resposta válida: {len(resposta['fatos_sugeridos'])} fato(s) sugerido(s) para o pedido {pedido['id']}.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
