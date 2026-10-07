"""Testes do servidor do Cadastro do Time (Bolt 2).

Uso:  python -m unittest discover -s agente-orquestrador/testes  (na raiz do Hack_OS)
"""

import json
import shutil
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path

AQUI = Path(__file__).resolve().parent
AGENTE = AQUI.parent
HACKOS = AGENTE.parent

sys.path.insert(0, str(AGENTE))
import servidor  # noqa: E402

SQUAD_VALIDO = {
    "hackathon": "Campus Mobile 2026",
    "membros": [
        {
            "id": "mem_1",
            "nome": "Ana",
            "frentes": ["narrativa"],
            "areas_afinidade": [
                {"area": "Green Tech & Agtech", "nivel": "experiencia", "como_agrega": "2 anos numa agtech."}
            ],
        }
    ],
}


class ErrosDoSquad(unittest.TestCase):
    def test_squad_valido_sem_erros(self):
        self.assertEqual(servidor.erros_do_squad(SQUAD_VALIDO), [])

    def test_nivel_fora_do_enum_e_recusado(self):
        ruim = json.loads(json.dumps(SQUAD_VALIDO))
        ruim["membros"][0]["areas_afinidade"][0]["nivel"] = "domina_totalmente"
        erros = servidor.erros_do_squad(ruim)
        self.assertTrue(any("nivel" in e for e in erros) or any("enum" in e for e in erros))

    def test_squad_sem_membros_e_recusado(self):
        ruim = {"hackathon": "X", "membros": []}
        self.assertTrue(servidor.erros_do_squad(ruim))

    def test_squad_sem_hackathon_e_recusado(self):
        ruim = json.loads(json.dumps(SQUAD_VALIDO))
        del ruim["hackathon"]
        self.assertTrue(servidor.erros_do_squad(ruim))


class ServidorDoCadastro(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.arquivo_original = servidor.SQUAD_ARQ
        cls.temporario = Path(tempfile.mkdtemp())
        servidor.SQUAD_ARQ = cls.temporario / "squad.json"
        cls.http = servidor.criar_servidor(0)
        cls.porta = cls.http.server_address[1]
        threading.Thread(target=cls.http.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.http.shutdown()
        cls.http.server_close()
        servidor.SQUAD_ARQ = cls.arquivo_original
        shutil.rmtree(cls.temporario, ignore_errors=True)

    def chamar(self, metodo, rota, corpo=None):
        dados = json.dumps(corpo).encode("utf-8") if corpo is not None else None
        req = urllib.request.Request(f"http://127.0.0.1:{self.porta}{rota}", data=dados, method=metodo, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req) as r:
                return r.status, r.read()
        except urllib.error.HTTPError as e:
            return e.code, e.read()

    def test_get_antes_de_qualquer_squad_devolve_vazio(self):
        if servidor.SQUAD_ARQ.exists():
            servidor.SQUAD_ARQ.unlink()
        status, corpo = self.chamar("GET", "/api/squad")
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(corpo), {"hackathon": "", "membros": []})

    def test_pagina_do_cadastro_responde_200(self):
        status, _ = self.chamar("GET", "/agente-orquestrador/cadastro/")
        self.assertEqual(status, 200)

    def test_salvar_e_ler_de_volta(self):
        status, corpo = self.chamar("POST", "/api/squad", SQUAD_VALIDO)
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(corpo)["membros"], 1)
        self.assertTrue(servidor.SQUAD_ARQ.exists())

        status, corpo = self.chamar("GET", "/api/squad")
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(corpo), SQUAD_VALIDO)

    def test_payload_invalido_e_recusado_e_nao_grava(self):
        if servidor.SQUAD_ARQ.exists():
            servidor.SQUAD_ARQ.unlink()
        ruim = json.loads(json.dumps(SQUAD_VALIDO))
        ruim["membros"][0]["areas_afinidade"][0]["nivel"] = "domina_totalmente"
        status, corpo = self.chamar("POST", "/api/squad", ruim)
        self.assertEqual(status, 400)
        self.assertIn("detalhes", json.loads(corpo))
        self.assertFalse(servidor.SQUAD_ARQ.exists())


if __name__ == "__main__":
    unittest.main()
