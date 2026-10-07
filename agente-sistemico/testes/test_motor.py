"""Testes do motor v1 (Bolt 4): servidor do quadro e validador da resposta.

Uso:  python -m unittest discover -s agente-sistemico/testes  (na raiz do Hack_OS)
"""

import copy
import json
import shutil
import subprocess
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
EXEMPLOS = HACKOS / "modelo-dados" / "exemplos" / "lastmile"

sys.path.insert(0, str(AGENTE))
sys.path.insert(0, str(HACKOS / "modelo-dados"))
import servidor  # noqa: E402
import validar_resposta  # noqa: E402


def ler(nome):
    return json.loads((EXEMPLOS / nome).read_text(encoding="utf-8"))


class PedidoMontadoPeloQuadro(unittest.TestCase):
    def test_pedido_do_quadro_passa_no_schema(self):
        script = (
            'import { readFileSync } from "node:fs";'
            'import { normalizar } from "./quadro/estado.js";'
            'import { validarMapa } from "./quadro/validador.js";'
            'import { montarPedido } from "./quadro/visoes.js";'
            'const m = normalizar(JSON.parse(readFileSync("../modelo-dados/exemplos/lastmile/mapa.json", "utf-8")));'
            "console.log(JSON.stringify(montarPedido(m, validarMapa(m), [])));"
        )
        saida = subprocess.run(["node", "--input-type=module", "-e", script], cwd=AGENTE, capture_output=True, text=True, encoding="utf-8", check=True)
        pedido = json.loads(saida.stdout)
        self.assertEqual(validar_resposta.erros_de_schema(pedido, "pedido_visao"), [])


class ValidadorDaResposta(unittest.TestCase):
    def setUp(self):
        self.pedido = ler("pedido-visao.json")
        self.resposta = ler("resposta-visao.json")

    def assertRecusada(self, resposta, trecho, pedido=None):
        achados = validar_resposta.problemas(resposta, pedido or self.pedido)
        self.assertTrue(any(trecho in a for a in achados), f"esperava '{trecho}' em {achados}")

    def test_exemplo_valido(self):
        self.assertEqual(validar_resposta.problemas(self.resposta, self.pedido), [])

    def test_resposta_de_outro_pedido(self):
        r = copy.deepcopy(self.resposta)
        r["pedido"] = "ped_outro"
        self.assertRecusada(r, "mas o pedido atual é ped_01")

    def test_ref_inexistente(self):
        r = copy.deepcopy(self.resposta)
        r["visoes"][0]["refs"] = ["var_inventada"]
        self.assertRecusada(r, "ref var_inventada não existe")

    def test_acima_do_limite(self):
        p = copy.deepcopy(self.pedido)
        p["limite_visoes"] = 2
        self.assertRecusada(self.resposta, "acima do limite de 2", pedido=p)

    def test_linguagem_de_solucao(self):
        r = copy.deepcopy(self.resposta)
        r["visoes"][1]["texto"] = "A solução seria criar um aplicativo de roteirização para os entregadores."
        self.assertRecusada(r, "descreve solução de produto")

    def test_pergunta_de_visao_ainda_aberta(self):
        p = copy.deepcopy(self.pedido)
        p["visoes_abertas"] = [copy.deepcopy(self.resposta["visoes"][2])]
        p["visoes_abertas"][0]["id"] = "vis_antiga"
        self.assertRecusada(self.resposta, "repete a pergunta de uma visão ainda aberta", pedido=p)

    def test_conexao_sugerida_repetindo_seta(self):
        r = copy.deepcopy(self.resposta)
        r["visoes"][0].update({
            "tipo": "conexao_sugerida",
            "proposta_seta": {"de": "var_tempo", "para": "var_pressao", "polaridade": "+", "atraso": False, "mecanismo": "x"},
        })
        self.assertRecusada(r, "a seta proposta já existe no mapa")

    def test_conexao_sugerida_com_variavel_inexistente(self):
        r = copy.deepcopy(self.resposta)
        r["visoes"][0].update({
            "tipo": "conexao_sugerida",
            "proposta_seta": {"de": "var_tempo", "para": "var_nova", "polaridade": "+", "atraso": False, "mecanismo": "x"},
        })
        self.assertRecusada(r, "proposta_seta.para = var_nova não é variável do mapa")

    def test_ideia_ja_estacionada(self):
        p = copy.deepcopy(self.pedido)
        p["estacionamento"] = ler("estacionamento.json")
        self.assertEqual(validar_resposta.erros_de_schema(p, "pedido_visao"), [], "pedido com estacionamento vale no contrato")
        r = copy.deepcopy(self.resposta)
        r["visoes"][1].update({"tipo": "estacionar", "texto_estacionado": "um app de roteirização com IA para os entregadores."})
        self.assertRecusada(r, "essa ideia já está no estacionamento", pedido=p)

    # Legibilidade e fonte (Bolt 6)
    def test_id_tecnico_no_texto(self):
        r = copy.deepcopy(self.resposta)
        r["visoes"][1]["texto"] = "O caminho var_pressao → var_contratos não fecha."
        self.assertRecusada(r, 'mostra o id técnico "var_pressao"')

    def test_nome_comum_nao_e_id(self):
        r = copy.deepcopy(self.resposta)
        r["visoes"][1]["texto"] = "A variável de pressão sobre a operação não tem meta."
        self.assertEqual(validar_resposta.problemas(r, self.pedido), [])

    def test_pergunta_composta(self):
        r = copy.deepcopy(self.resposta)
        r["visoes"][1]["pergunta"] = "Quem decide? E quanto tempo leva?"
        self.assertRecusada(r, "faça uma pergunta só")

    def test_texto_longo_e_refs_demais(self):
        r = copy.deepcopy(self.resposta)
        r["visoes"][1]["texto"] = "x " * 300
        r["visoes"][1]["refs"] = ["var_pressao", "var_contratos", "var_tempo", "var_carga", "var_demanda"]
        self.assertRecusada(r, "acima de 450")
        self.assertRecusada(r, "5 refs, acima de 4")

    def test_fonte_fora_do_catalogo(self):
        r = copy.deepcopy(self.resposta)
        r["visoes"][1]["fonte_teorica"]["referencia"] = "Livro que inventei"
        self.assertRecusada(r, "não está no catálogo das aulas")

    def test_fonte_que_nao_combina_com_o_tipo(self):
        r = copy.deepcopy(self.resposta)
        r["visoes"][1]["fonte_teorica"]["referencia"] = "Estacionamento (Lean Inception)"
        self.assertRecusada(r, "não combina com uma visão do tipo visao_ausente")

    def test_fonte_com_detalhe_e_suplementar(self):
        r = copy.deepcopy(self.resposta)
        r["visoes"][1]["fonte_teorica"]["referencia"] = "Arquétipos sistêmicos: limites ao crescimento"
        self.assertEqual(validar_resposta.problemas(r, self.pedido), [])
        r["visoes"][1]["fonte_teorica"] = {"referencia": "Bland, mapa de suposições", "suplementar": True}
        self.assertEqual(validar_resposta.problemas(r, self.pedido), [])

    # Entrevista em rodadas (Bolt 7)
    def resposta_com_entrevista(self, **extra):
        r = {
            "versao": 1, "pedido": "ped_01", "criado_em": "2026-10-05T10:00:00-03:00",
            "informacao_insuficiente": True, "visoes": [],
            "entrevista": {
                "rodada": 1,
                "objetivo": "Sair do tema para uma situação concreta.",
                "perguntas": [
                    {"id": "ent_situacao", "pergunta": "Que situação mais incomoda?", "opcoes": ["Atrasos", "Cancelamentos"], "campo": "situacao"},
                    {"id": "ent_quem", "pergunta": "Quem sofre com isso?", "campo": "afetados"},
                ],
            },
        }
        r.update(extra)
        return r

    def test_entrevista_valida(self):
        self.assertEqual(validar_resposta.problemas(self.resposta_com_entrevista(), self.pedido), [])

    def test_informacao_insuficiente_exige_entrevista(self):
        r = self.resposta_com_entrevista()
        del r["entrevista"]
        self.assertRecusada(r, "informação insuficiente sem rodada de entrevista")

    def test_rodada_fora_de_ordem(self):
        p = copy.deepcopy(self.pedido)
        p["entrevista"] = {"rodadas": [{"rodada": 1, "objetivo": "x", "perguntas": [], "respostas": []}]}
        self.assertRecusada(self.resposta_com_entrevista(), "rodada 1, mas a próxima é a 2", pedido=p)

    def test_opcao_que_e_solucao(self):
        r = self.resposta_com_entrevista()
        r["entrevista"]["perguntas"][0]["opcoes"] = ["Atrasos", "Criar um app de rastreamento"]
        self.assertRecusada(r, "descreve solução de produto")

    def test_pergunta_da_entrevista_com_id(self):
        r = self.resposta_com_entrevista()
        r["entrevista"]["perguntas"][1]["pergunta"] = "Quem sofre com var_tempo?"
        self.assertRecusada(r, "mostra id técnico")

    def test_proposta_de_contexto(self):
        r = self.resposta_com_entrevista(informacao_insuficiente=False)
        del r["entrevista"]
        r["proposta_contexto"] = {"pergunta_problema": "Por que o tempo de entrega sobe apesar das realocações?", "horizonte_tempo": "6 meses"}
        self.assertEqual(validar_resposta.problemas(r, self.pedido), [])
        self.assertEqual(validar_resposta.erros_de_schema(r, "resposta_visao"), [])
        r["proposta_contexto"]["pergunta_problema"] = "Desenvolver um aplicativo de rotas?"
        self.assertRecusada(r, "proposta_contexto.pergunta_problema: descreve solução de produto")

    # Rascunho de CLD proposto pelo agente (Bolt 7b)
    def resposta_com_rascunho(self, **overrides_rascunho):
        r = copy.deepcopy(self.resposta)
        r["visoes"] = [{
            "id": "vis_rascunho",
            "tipo": "rascunho_mapa",
            "texto": "Com a pergunta-problema definida, um primeiro rascunho ajuda a situar o sistema.",
            "pergunta": "Este rascunho explica o suficiente da pergunta-problema?",
            "refs": [],
            "fonte_teorica": {"referencia": "CLD: variáveis, setas e mecanismo", "suplementar": False},
            "status": "aberta",
            "proposta_rascunho": {
                "variaveis": [
                    {"id_temp": "tmp_a", "nome": "Reputação do app nas lojas de aplicativo", "tipo": "resultado"},
                    {"id_temp": "tmp_b", "nome": "Candidatos a entregador", "tipo": "neutra"},
                ],
                "setas": [
                    {"de": "var_satisfacao", "para": "tmp_a", "polaridade": "+", "atraso": False, "mecanismo": "Lojistas satisfeitos deixam avaliações melhores nas lojas de aplicativo."},
                    {"de": "tmp_a", "para": "tmp_b", "polaridade": "+", "atraso": True, "mecanismo": "Reputação melhor atrai candidatos a entregador."},
                ],
                **overrides_rascunho,
            },
        }]
        return r

    def test_rascunho_valido(self):
        self.assertEqual(validar_resposta.problemas(self.resposta_com_rascunho(), self.pedido), [])

    # Hipótese -> proposta de item para a Matriz CSD (Bolt 8)
    def resposta_com_hipotese(self, **overrides_proposta):
        r = copy.deepcopy(self.resposta)
        r["visoes"] = [{
            "id": "vis_hip",
            "tipo": "hipotese",
            "texto": "A capacidade real de entrega por praça nunca foi medida.",
            "pergunta": "Qual é a capacidade real de entrega de cada praça?",
            "refs": ["var_carga"],
            "fonte_teorica": {"referencia": "Matriz CSD", "suplementar": False},
            "status": "aberta",
            "proposta_csd": {
                "id": "csd_01",
                "tipo": "suposicao",
                "texto": "A capacidade real de entrega por praça não é conhecida.",
                "autor": "agente",
                "criado_em": r["criado_em"],
                "status": "proposto",
                "origem": {"etapa": "mapa_sistemico", "ref": "seta_03"},
                "evidencias": [],
                "pergunta_pesquisa": "Quantas entregas cada entregador consegue fazer por turno, em média?",
                **overrides_proposta,
            },
        }]
        return r

    def test_hipotese_com_proposta_csd_valida(self):
        self.assertEqual(validar_resposta.problemas(self.resposta_com_hipotese(), self.pedido), [])

    def test_hipotese_sem_id_na_proposta_csd_e_recusada_pelo_schema(self):
        r = self.resposta_com_hipotese()
        del r["visoes"][0]["proposta_csd"]["id"]
        achados = validar_resposta.problemas(r, self.pedido)
        self.assertTrue(achados and all(a.startswith("schema:") for a in achados))

    def test_hipotese_sem_pergunta_pesquisa_e_recusada_pelo_schema(self):
        r = self.resposta_com_hipotese()
        del r["visoes"][0]["proposta_csd"]["pergunta_pesquisa"]
        achados = validar_resposta.problemas(r, self.pedido)
        self.assertTrue(achados and all(a.startswith("schema:") for a in achados))

    def test_rascunho_ids_temporarios_repetidos(self):
        r = self.resposta_com_rascunho(variaveis=[
            {"id_temp": "tmp_a", "nome": "Reputação do app", "tipo": "resultado"},
            {"id_temp": "tmp_a", "nome": "Candidatos a entregador", "tipo": "neutra"},
        ])
        self.assertRecusada(r, "ids temporários repetidos no rascunho")

    def test_rascunho_seta_refere_variavel_inexistente(self):
        r = self.resposta_com_rascunho(setas=[
            {"de": "var_satisfacao", "para": "tmp_fantasma", "polaridade": "+", "atraso": False, "mecanismo": "x"},
        ])
        self.assertRecusada(r, "refere-se a tmp_fantasma, que não é variável do mapa nem do próprio rascunho")

    def test_rascunho_repete_seta_que_ja_existe_no_mapa(self):
        # seta_12 do exemplo já liga var_satisfacao -> var_contratos (+).
        r = self.resposta_com_rascunho(setas=[
            {"de": "var_satisfacao", "para": "var_contratos", "polaridade": "+", "atraso": False, "mecanismo": "x"},
        ])
        self.assertRecusada(r, "repete uma seta que já existe no mapa")

    def test_rascunho_repete_a_mesma_seta_duas_vezes(self):
        seta = {"de": "var_satisfacao", "para": "tmp_a", "polaridade": "+", "atraso": False, "mecanismo": "x"}
        r = self.resposta_com_rascunho(setas=[seta, dict(seta)])
        self.assertRecusada(r, "repete a mesma seta duas vezes")

    def test_rascunho_com_id_tecnico_no_mecanismo(self):
        r = self.resposta_com_rascunho(setas=[
            {"de": "var_satisfacao", "para": "tmp_a", "polaridade": "+", "atraso": False, "mecanismo": "Segue o mesmo padrão de var_contratos."},
        ])
        self.assertRecusada(r, "o mecanismo de uma seta do rascunho mostra id técnico")

    def test_rascunho_com_variavel_de_solucao(self):
        r = self.resposta_com_rascunho(variaveis=[
            {"id_temp": "tmp_a", "nome": "App de roteirização", "tipo": "neutra"},
            {"id_temp": "tmp_b", "nome": "Candidatos a entregador", "tipo": "neutra"},
        ], setas=[
            {"de": "tmp_a", "para": "tmp_b", "polaridade": "+", "atraso": False, "mecanismo": "Uma boa solução seria lançar um aplicativo de roteirização para os entregadores."},
        ])
        self.assertRecusada(r, "descreve solução de produto")

    def test_schema_vem_primeiro(self):
        r = copy.deepcopy(self.resposta)
        r["visoes"][0]["tipo"] = "solucao"
        achados = validar_resposta.problemas(r, self.pedido)
        self.assertTrue(achados and all(a.startswith("schema:") for a in achados))


class ServidorDoQuadro(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.sessoes_originais = servidor.SESSOES
        cls.panorama_original = servidor.PANORAMA_ARQ
        cls.squad_original = servidor.SQUAD_ARQ
        cls.temporario = Path(tempfile.mkdtemp())
        servidor.SESSOES = cls.temporario
        servidor.PANORAMA_ARQ = cls.temporario / "panorama.json"
        servidor.SQUAD_ARQ = cls.temporario / "squad.json"
        cls.http = servidor.criar_servidor(0)
        cls.porta = cls.http.server_address[1]
        threading.Thread(target=cls.http.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.http.shutdown()
        cls.http.server_close()
        servidor.SESSOES = cls.sessoes_originais
        servidor.PANORAMA_ARQ = cls.panorama_original
        servidor.SQUAD_ARQ = cls.squad_original
        shutil.rmtree(cls.temporario, ignore_errors=True)

    def chamar(self, metodo, rota, corpo=None):
        dados = json.dumps(corpo).encode("utf-8") if corpo is not None else None
        req = urllib.request.Request(f"http://127.0.0.1:{self.porta}{rota}", data=dados, method=metodo, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req) as r:
                return r.status, r.headers, r.read()
        except urllib.error.HTTPError as e:
            return e.code, e.headers, e.read()

    def test_ciclo_pedido_resposta(self):
        pedido = ler("pedido-visao.json")
        status, _, corpo = self.chamar("POST", "/api/sessoes/rec_lastmile/pedido", pedido)
        self.assertEqual(status, 201)
        self.assertEqual(json.loads(corpo)["comando"], "/visao-sistemica rec_lastmile")
        self.assertTrue((self.temporario / "rec_lastmile" / "mapa.json").exists())

        status, _, _ = self.chamar("GET", "/api/sessoes/rec_lastmile/resposta")
        self.assertEqual(status, 202, "sem resposta ainda")

        resposta = ler("resposta-visao.json")
        (self.temporario / "rec_lastmile" / "resposta-visao.json").write_text(json.dumps(resposta), encoding="utf-8")
        status, _, corpo = self.chamar("GET", "/api/sessoes/rec_lastmile/resposta")
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(corpo)["pedido"], "ped_01")

        novo = copy.deepcopy(pedido)
        novo["id"] = "ped_02"
        self.chamar("POST", "/api/sessoes/rec_lastmile/pedido", novo)
        status, _, _ = self.chamar("GET", "/api/sessoes/rec_lastmile/resposta")
        self.assertEqual(status, 202, "a resposta antiga não serve para o pedido novo")

    def test_estacionamento_grava_e_le(self):
        status, _, corpo = self.chamar("GET", "/api/sessoes/rec_novo/estacionamento")
        self.assertEqual((status, json.loads(corpo)), (200, {"itens": []}), "sem arquivo, lista vazia")
        est = ler("estacionamento.json")
        status, _, _ = self.chamar("POST", "/api/sessoes/rec_novo/estacionamento", est)
        self.assertEqual(status, 200)
        status, _, corpo = self.chamar("GET", "/api/sessoes/rec_novo/estacionamento")
        self.assertEqual(json.loads(corpo), est)
        status, _, _ = self.chamar("POST", "/api/sessoes/rec_novo/estacionamento", {"ideias": []})
        self.assertEqual(status, 400)

    def test_documentos_do_squad(self):
        status, _, corpo = self.chamar("GET", "/api/sessoes/rec_novo/entrevista")
        self.assertEqual((status, json.loads(corpo)), (200, {"rodadas": []}))
        doc = {"rodadas": [{"rodada": 1, "objetivo": "x", "perguntas": []}]}
        self.assertEqual(self.chamar("POST", "/api/sessoes/rec_novo/entrevista", doc)[0], 200)
        self.assertEqual(json.loads(self.chamar("GET", "/api/sessoes/rec_novo/entrevista")[2]), doc)
        self.assertEqual(self.chamar("POST", "/api/sessoes/rec_novo/entrevista", {"itens": []})[0], 400)

    def test_csd_grava_e_le(self):
        status, _, corpo = self.chamar("GET", "/api/sessoes/rec_novo/csd")
        self.assertEqual((status, json.loads(corpo)), (200, {"itens": []}), "sem arquivo, lista vazia")
        doc = {"itens": [{"id": "csd_01", "tipo": "suposicao", "texto": "x", "autor": "mem_a",
                           "criado_em": "2026-10-05T10:00:00-03:00", "status": "proposto",
                           "origem": {"etapa": "mapa_sistemico"}, "evidencias": [], "pergunta_pesquisa": "x?"}]}
        self.assertEqual(self.chamar("POST", "/api/sessoes/rec_novo/csd", doc)[0], 200)
        self.assertEqual(json.loads(self.chamar("GET", "/api/sessoes/rec_novo/csd")[2]), doc)
        self.assertEqual(self.chamar("POST", "/api/sessoes/rec_novo/csd", {"rodadas": []})[0], 400)

    def test_ritual_grava_e_le(self):
        status, _, corpo = self.chamar("GET", "/api/sessoes/rec_novo/ritual")
        self.assertEqual((status, json.loads(corpo)), (200, {"reflexoes": []}), "sem arquivo, lista vazia")
        doc = {"id": "rit_01", "recorte": "rec_novo", "pergunta_generativa": "O que te surpreendeu?",
               "duracao_min": 5, "aberto_em": "2026-10-05T10:00:00-03:00",
               "reflexoes": [{"id": "ref_01", "autor": "mem_a", "tipo": "percepcao", "texto": "x",
                              "criado_em": "2026-10-05T10:01:00-03:00"}]}
        self.assertEqual(self.chamar("POST", "/api/sessoes/rec_novo/ritual", doc)[0], 200)
        self.assertEqual(json.loads(self.chamar("GET", "/api/sessoes/rec_novo/ritual")[2]), doc)
        self.assertEqual(self.chamar("POST", "/api/sessoes/rec_novo/ritual", {"itens": []})[0], 400)

    def test_panorama_grava_e_le(self):
        # Não é por recorte (/api/panorama direto), diferente dos demais
        # documentos do squad testados acima.
        status, _, corpo = self.chamar("GET", "/api/panorama")
        self.assertEqual((status, json.loads(corpo)), (200, servidor.PANORAMA_VAZIO), "sem arquivo, panorama vazio")
        doc = {
            "versao": 1,
            "cenarios": [{"id": "cen_1", "nome": "Green Tech & Agtech"}],
            "fatos": [{"id": "fat_1", "cenario": "cen_1", "texto": "x",
                       "evidencia": {"tipo": "estimativa", "descricao": "conta aberta", "contem_dado_pessoal": False},
                       "classificacao_csd": "suposicao", "autor": "mem_a"}],
            "clusters": [], "problemas_candidatos": [], "criterios_ranqueamento": [], "ranqueamento": [],
        }
        status, _, corpo = self.chamar("POST", "/api/panorama", doc)
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(corpo), {"cenarios": 1, "fatos": 1})
        self.assertEqual(json.loads(self.chamar("GET", "/api/panorama")[2]), doc)
        # falta "cenarios" -> recusado
        self.assertEqual(self.chamar("POST", "/api/panorama", {"fatos": []})[0], 400)

    def test_squad_so_leitura(self):
        # Bolt 4 do Panorama: lê o Cadastro do Time (dono é agente-orquestrador/
        # servidor.py) pro apoio da nota de "aderência ao time". Só GET aqui.
        status, _, corpo = self.chamar("GET", "/api/squad")
        self.assertEqual((status, json.loads(corpo)), (200, servidor.SQUAD_VAZIO), "sem arquivo, squad vazio")
        doc = {"hackathon": "Campus Mobile 2026", "membros": [
            {"id": "mem_1", "nome": "Ana", "areas_afinidade": [{"area": "Green Tech & Agtech", "nivel": "experiencia"}]},
        ]}
        servidor.SQUAD_ARQ.write_text(json.dumps(doc), encoding="utf-8")
        status, _, corpo = self.chamar("GET", "/api/squad")
        self.assertEqual((status, json.loads(corpo)), (200, doc))

    def test_resposta_nao_aceita_post(self):
        status, _, _ = self.chamar("POST", "/api/sessoes/rec_lastmile/resposta", {"x": 1})
        self.assertEqual(status, 404)

    def test_recorte_da_rota_precisa_ser_o_do_mapa(self):
        status, _, corpo = self.chamar("POST", "/api/sessoes/rec_outro/pedido", ler("pedido-visao.json"))
        self.assertEqual(status, 400)
        self.assertIn("recorte", json.loads(corpo)["erro"])

    def test_rota_com_caminho_estranho_nao_e_api(self):
        status, headers, _ = self.chamar("GET", "/api/sessoes/..%2F..%2Fsegredo/pedido")
        self.assertNotIn("application/json", headers.get("Content-Type", ""))
        self.assertEqual(status, 404)

    def test_pedido_sem_mapa_e_recusado(self):
        status, _, _ = self.chamar("POST", "/api/sessoes/rec_lastmile/pedido", {"versao": 1, "id": "ped_x"})
        self.assertEqual(status, 400)

    def test_serve_o_quadro_sem_cache(self):
        status, headers, corpo = self.chamar("GET", "/agente-sistemico/quadro/index.html")
        self.assertEqual(status, 200)
        self.assertEqual(headers.get("Cache-Control"), "no-store")
        self.assertIn("Quadro Sistêmico", corpo.decode("utf-8"))


if __name__ == "__main__":
    unittest.main()
