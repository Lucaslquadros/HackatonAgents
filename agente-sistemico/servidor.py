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

Os arquivos ficam em agente-sistemico/sessoes/<recorte>/. O comando
/visao-sistemica, rodado no Claude Code, lê o pedido e grava a resposta.

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
ROTA = re.compile(r"^/api/sessoes/([a-z]+_[a-z0-9_-]{1,60})/(pedido|resposta|estacionamento|entrevista)$")
ID = re.compile(r"^[a-z]+_[a-z0-9_-]+$")
LIMITE_CORPO = 2 * 1024 * 1024
# Documentos do squad que o quadro guarda inteiros: arquivo e lista obrigatória.
DOCUMENTOS = {
    "estacionamento": ("estacionamento.json", "itens"),
    "entrevista": ("entrevista.json", "rodadas"),
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
        rota = ROTA.match(self.path.split("?")[0])
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
        rota = ROTA.match(self.path.split("?")[0])
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
