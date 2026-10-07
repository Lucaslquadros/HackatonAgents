"""Servidor local do quadro (Bolt 4).

Serve os arquivos do Hack_OS (o quadro e o modelo de dados) e faz a ponte
com o motor do agente, que nesta versão é uma sessão do Claude Code:

  POST /api/sessoes/<recorte>/pedido    o quadro grava pedido-visao.json
  GET  /api/sessoes/<recorte>/pedido    lê o pedido atual
  GET  /api/sessoes/<recorte>/resposta  devolve resposta-visao.json quando
                                        ela corresponde ao pedido atual
  GET  /api/sessoes/<recorte>/estacionamento   ideias estacionadas
  POST /api/sessoes/<recorte>/estacionamento   grava estacionamento.json
  GET  /api/sessoes/<recorte>/entrevista       histórico da entrevista
  POST /api/sessoes/<recorte>/entrevista       grava entrevista.json
  GET  /api/sessoes/<recorte>/csd              itens da Matriz CSD
  POST /api/sessoes/<recorte>/csd              grava csd.json
  GET  /api/sessoes/<recorte>/ritual           ritual do fundo do U atual
  POST /api/sessoes/<recorte>/ritual           grava ritual.json

  GET  /api/panorama   estado do Agente de Panorama (panorama vazio se
                        ainda não existe)
  POST /api/panorama   grava panorama.json

  POST /api/panorama/sessao/<cenario>/pedido     grava o pedido ao motor
                                                  (Bolt 6), devolve o comando
  GET  /api/panorama/sessao/<cenario>/pedido     lê o pedido atual
  GET  /api/panorama/sessao/<cenario>/resposta   fatos sugeridos (202
                                                  enquanto não corresponde
                                                  ao pedido atual)

  GET  /api/squad      Cadastro do Time (Hack_OS/squad.json, squad vazio
                        se ainda não existe) — só leitura aqui; quem grava
                        é o Cadastro do Time (agente-orquestrador/servidor.py).
                        Usado pelo Bolt 4 do Panorama (apoio à nota de
                        "aderência ao time" no ranqueamento).

Os arquivos de sessão ficam em agente-sistemico/sessoes/<recorte>/.
`panorama.json` fica em agente-sistemico/ direto — não é por recorte,
é um objeto só por squad, que existe antes de qualquer recorte nascer
(Inception do Agente de Panorama, decisão 13). O comando /visao-sistemica,
rodado no Claude Code, lê o pedido e grava a resposta.

Só biblioteca padrão. Escuta apenas em 127.0.0.1.

Uso:  python agente-sistemico/servidor.py [porta]
"""

import json
import re
import sys
from functools import partial
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent  # Hack_OS
SESSOES = AQUI / "sessoes"
PANORAMA_ARQ = AQUI / "panorama.json"
PANORAMA_VAZIO = {
    "versao": 1, "cenarios": [], "fatos": [], "clusters": [],
    "problemas_candidatos": [], "criterios_ranqueamento": [], "ranqueamento": [],
}
SQUAD_ARQ = RAIZ / "squad.json"
SQUAD_VAZIO = {"hackathon": "", "membros": []}
PANORAMA_SESSOES = AQUI / "panorama-sessoes"
ROTA = re.compile(r"^/api/sessoes/([a-z]+_[a-z0-9_-]{1,60})/(pedido|resposta|estacionamento|entrevista|csd|ritual)$")
ROTA_PANORAMA_SESSAO = re.compile(r"^/api/panorama/sessao/([a-z]+_[a-z0-9_-]{1,60})/(pedido|resposta)$")
ID = re.compile(r"^[a-z]+_[a-z0-9_-]+$")
LIMITE_CORPO = 2 * 1024 * 1024
# Documentos do squad que o quadro guarda inteiros: arquivo e lista obrigatória.
# `ritual` também é um objeto completo (não só uma lista), mas já tem uma
# lista obrigatória própria (`reflexoes`), então serve ao mesmo mecanismo
# genérico sem código novo.
DOCUMENTOS = {
    "estacionamento": ("estacionamento.json", "itens"),
    "entrevista": ("entrevista.json", "rodadas"),
    "csd": ("csd.json", "itens"),
    "ritual": ("ritual.json", "reflexoes"),
}


def ler_json(caminho):
    with open(caminho, encoding="utf-8") as f:
        return json.load(f)


def gravar_json(caminho, dado):
    caminho.parent.mkdir(parents=True, exist_ok=True)
    temporario = caminho.with_suffix(".tmp")
    with open(temporario, "w", encoding="utf-8") as f:
        json.dump(dado, f, ensure_ascii=False, indent=2)
        f.write("\n")
    temporario.replace(caminho)


def problemas_do_pedido(pedido):
    """Checagem mínima na entrada; a validação completa é do schema."""
    if not isinstance(pedido, dict):
        return ["o pedido precisa ser um objeto JSON"]
    erros = []
    if pedido.get("versao") != 1:
        erros.append("versao precisa ser 1")
    if not isinstance(pedido.get("id"), str) or not ID.match(pedido["id"]):
        erros.append("id inválido")
    if not isinstance(pedido.get("mapa"), dict):
        erros.append("falta o mapa")
    if not isinstance(pedido.get("validacao"), dict):
        erros.append("falta a validação")
    return erros


def problemas_do_pedido_panorama(pedido):
    """Checagem mínima na entrada; a validação completa é do schema (Bolt 6)."""
    if not isinstance(pedido, dict):
        return ["o pedido precisa ser um objeto JSON"]
    erros = []
    if pedido.get("versao") != 1:
        erros.append("versao precisa ser 1")
    if not isinstance(pedido.get("id"), str) or not ID.match(pedido["id"]):
        erros.append("id inválido")
    if not isinstance(pedido.get("cenario"), dict):
        erros.append("falta o cenario")
    if not isinstance(pedido.get("fatos_existentes"), list):
        erros.append("falta fatos_existentes (pode ser lista vazia)")
    return erros


class Manipulador(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Sem cache: o quadro é editado com frequência durante o hackathon.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def responder_json(self, status, dado):
        corpo = json.dumps(dado, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)

    def do_GET(self):
        caminho = self.path.split("?")[0]
        if caminho == "/api/panorama":
            return self.responder_json(HTTPStatus.OK, ler_json(PANORAMA_ARQ) if PANORAMA_ARQ.exists() else PANORAMA_VAZIO)
        if caminho == "/api/squad":
            return self.responder_json(HTTPStatus.OK, ler_json(SQUAD_ARQ) if SQUAD_ARQ.exists() else SQUAD_VAZIO)
        rota_pan = ROTA_PANORAMA_SESSAO.match(caminho)
        if rota_pan:
            cenario, recurso = rota_pan.groups()
            pasta = PANORAMA_SESSOES / cenario
            pedido_arq = pasta / "pedido.json"
            if not pedido_arq.exists():
                return self.responder_json(HTTPStatus.NOT_FOUND, {"erro": "nenhum pedido para este cenário"})
            pedido = ler_json(pedido_arq)
            if recurso == "pedido":
                return self.responder_json(HTTPStatus.OK, pedido)
            resposta_arq = pasta / "resposta.json"
            if resposta_arq.exists():
                resposta = ler_json(resposta_arq)
                if resposta.get("pedido") == pedido["id"]:
                    return self.responder_json(HTTPStatus.OK, resposta)
            return self.responder_json(HTTPStatus.ACCEPTED, {"aguardando": pedido["id"]})
        rota = ROTA.match(caminho)
        if not rota:
            return super().do_GET()
        recorte, recurso = rota.groups()
        pasta = SESSOES / recorte
        if recurso in DOCUMENTOS:
            arquivo, lista = DOCUMENTOS[recurso]
            arq = pasta / arquivo
            return self.responder_json(HTTPStatus.OK, ler_json(arq) if arq.exists() else {lista: []})
        pedido_arq = pasta / "pedido-visao.json"
        if not pedido_arq.exists():
            return self.responder_json(HTTPStatus.NOT_FOUND, {"erro": "nenhum pedido para este recorte"})
        pedido = ler_json(pedido_arq)
        if recurso == "pedido":
            return self.responder_json(HTTPStatus.OK, pedido)
        resposta_arq = pasta / "resposta-visao.json"
        if resposta_arq.exists():
            resposta = ler_json(resposta_arq)
            if resposta.get("pedido") == pedido["id"]:
                return self.responder_json(HTTPStatus.OK, resposta)
        return self.responder_json(HTTPStatus.ACCEPTED, {"aguardando": pedido["id"]})

    def do_POST(self):
        caminho = self.path.split("?")[0]
        tamanho_pan = int(self.headers.get("Content-Length") or 0)
        if caminho == "/api/panorama":
            if tamanho_pan <= 0 or tamanho_pan > LIMITE_CORPO:
                return self.responder_json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"erro": "corpo vazio ou grande demais"})
            try:
                corpo = json.loads(self.rfile.read(tamanho_pan).decode("utf-8"))
            except (ValueError, UnicodeDecodeError):
                return self.responder_json(HTTPStatus.BAD_REQUEST, {"erro": "JSON inválido"})
            if not isinstance(corpo, dict) or not isinstance(corpo.get("cenarios"), list):
                return self.responder_json(HTTPStatus.BAD_REQUEST, {"erro": "panorama precisa ter a lista 'cenarios'"})
            gravar_json(PANORAMA_ARQ, corpo)
            return self.responder_json(HTTPStatus.OK, {"cenarios": len(corpo["cenarios"]), "fatos": len(corpo.get("fatos", []))})
        rota_pan = ROTA_PANORAMA_SESSAO.match(caminho)
        if rota_pan:
            cenario, recurso = rota_pan.groups()
            if recurso != "pedido":
                return self.responder_json(HTTPStatus.NOT_FOUND, {"erro": "rota inexistente"})
            tamanho_p = int(self.headers.get("Content-Length") or 0)
            if tamanho_p <= 0 or tamanho_p > LIMITE_CORPO:
                return self.responder_json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"erro": "corpo vazio ou grande demais"})
            try:
                pedido = json.loads(self.rfile.read(tamanho_p).decode("utf-8"))
            except (ValueError, UnicodeDecodeError):
                return self.responder_json(HTTPStatus.BAD_REQUEST, {"erro": "JSON inválido"})
            erros = problemas_do_pedido_panorama(pedido)
            if erros:
                return self.responder_json(HTTPStatus.BAD_REQUEST, {"erro": "; ".join(erros)})
            gravar_json(PANORAMA_SESSOES / cenario / "pedido.json", pedido)
            return self.responder_json(HTTPStatus.CREATED, {"pedido": pedido["id"], "comando": f"/panorama {cenario}"})
        rota = ROTA.match(caminho)
        if not rota or rota.group(2) == "resposta":
            return self.responder_json(HTTPStatus.NOT_FOUND, {"erro": "rota inexistente"})
        recorte, recurso = rota.groups()
        tamanho = int(self.headers.get("Content-Length") or 0)
        if tamanho <= 0 or tamanho > LIMITE_CORPO:
            return self.responder_json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"erro": "corpo vazio ou grande demais"})
        try:
            corpo = json.loads(self.rfile.read(tamanho).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return self.responder_json(HTTPStatus.BAD_REQUEST, {"erro": "JSON inválido"})
        if recurso in DOCUMENTOS:
            arquivo, lista = DOCUMENTOS[recurso]
            if not isinstance(corpo, dict) or not isinstance(corpo.get(lista), list):
                return self.responder_json(HTTPStatus.BAD_REQUEST, {"erro": f"{recurso} precisa ter a lista '{lista}'"})
            gravar_json(SESSOES / recorte / arquivo, corpo)
            return self.responder_json(HTTPStatus.OK, {lista: len(corpo[lista])})
        pedido = corpo
        erros = problemas_do_pedido(pedido)
        if pedido.get("mapa", {}).get("recorte") != recorte:
            erros.append("o recorte da rota não é o do mapa")
        if erros:
            return self.responder_json(HTTPStatus.BAD_REQUEST, {"erro": "; ".join(erros)})
        pasta = SESSOES / recorte
        gravar_json(pasta / "pedido-visao.json", pedido)
        gravar_json(pasta / "mapa.json", pedido["mapa"])
        return self.responder_json(HTTPStatus.CREATED, {"pedido": pedido["id"], "comando": f"/visao-sistemica {recorte}"})

    def log_message(self, formato, *args):
        # Mostra só as chamadas à API e os erros; os arquivos estáticos poluem o terminal.
        primeiro = str(args[0]) if args else ""
        if "/api/" in primeiro or formato.startswith("code"):
            super().log_message(formato, *args)


def criar_servidor(porta=8765):
    return ThreadingHTTPServer(("127.0.0.1", porta), partial(Manipulador, directory=str(RAIZ)))


if __name__ == "__main__":
    porta = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    servidor = criar_servidor(porta)
    print(f"Quadro em http://127.0.0.1:{porta}/agente-sistemico/quadro/  (Ctrl+C para parar)")
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        pass
