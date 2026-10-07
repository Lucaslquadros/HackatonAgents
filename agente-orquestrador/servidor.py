"""Servidor local do Cadastro do Time (Bolt 2).

Serve a tela de cadastro e persiste o squad da plataforma inteira —
não de um agente específico, por isso o arquivo fica na raiz do Hack_OS,
não dentro de agente-orquestrador/:

  GET  /api/squad   lê Hack_OS/squad.json (squad vazio se ainda não existe)
  POST /api/squad   valida contra $defs/squad do schema e grava

Só biblioteca padrão + jsonschema (já usada em todo o resto do projeto
para validar contra modelo-dados/hackos.schema.json).

Uso:  python agente-orquestrador/servidor.py [porta]
"""

import json
import socket
import sys
from functools import partial
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent  # Hack_OS
SQUAD_ARQ = RAIZ / "squad.json"
LIMITE_CORPO = 1 * 1024 * 1024

SCHEMA = json.loads((RAIZ / "modelo-dados" / "hackos.schema.json").read_text(encoding="utf-8"))


def validador_squad():
    schema = dict(SCHEMA)
    schema["$ref"] = "#/$defs/squad"
    return Draft202012Validator(schema, format_checker=FormatChecker())


def erros_do_squad(doc):
    return [f"{'.'.join(str(p) for p in e.absolute_path) or '(raiz)'}: {e.message}" for e in validador_squad().iter_errors(doc)]


def ler_squad():
    if not SQUAD_ARQ.exists():
        return {"hackathon": "", "membros": []}
    return json.loads(SQUAD_ARQ.read_text(encoding="utf-8"))


def gravar_squad(squad):
    temporario = SQUAD_ARQ.with_suffix(".tmp")
    temporario.write_text(json.dumps(squad, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporario.replace(SQUAD_ARQ)


class Manipulador(SimpleHTTPRequestHandler):
    def end_headers(self):
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
        if self.path.split("?")[0] == "/api/squad":
            return self.responder_json(HTTPStatus.OK, ler_squad())
        return super().do_GET()

    def do_POST(self):
        if self.path.split("?")[0] != "/api/squad":
            return self.responder_json(HTTPStatus.NOT_FOUND, {"erro": "rota inexistente"})
        tamanho = int(self.headers.get("Content-Length") or 0)
        if tamanho <= 0 or tamanho > LIMITE_CORPO:
            return self.responder_json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"erro": "corpo vazio ou grande demais"})
        try:
            squad = json.loads(self.rfile.read(tamanho).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return self.responder_json(HTTPStatus.BAD_REQUEST, {"erro": "JSON inválido"})
        erros = erros_do_squad(squad)
        if erros:
            return self.responder_json(HTTPStatus.BAD_REQUEST, {"erro": "squad não passa no schema", "detalhes": erros})
        gravar_squad(squad)
        return self.responder_json(HTTPStatus.OK, {"membros": len(squad["membros"])})

    def log_message(self, formato, *args):
        primeiro = str(args[0]) if args else ""
        if "/api/" in primeiro or formato.startswith("code"):
            super().log_message(formato, *args)


def criar_servidor(porta=8766, bind="0.0.0.0"):
    return ThreadingHTTPServer((bind, porta), partial(Manipulador, directory=str(RAIZ)))


def _ip_da_rede_local():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except OSError:
        return None
    finally:
        s.close()


if __name__ == "__main__":
    porta = int(sys.argv[1]) if len(sys.argv) > 1 else 8766
    servidor = criar_servidor(porta)
    ip_local = _ip_da_rede_local()
    print(f"Cadastro do Time em http://127.0.0.1:{porta}/agente-orquestrador/cadastro/  (Ctrl+C para parar)")
    if ip_local:
        print(f"Na mesma rede: http://{ip_local}:{porta}/agente-orquestrador/cadastro/")
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        pass
