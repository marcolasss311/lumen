const db = require("../db");

/**
 * Limpeza periódica:
 * - destrava simulados que ficaram em "corrigindo" (ex.: servidor reiniciou no meio da correção);
 * - remove simulados abandonados (gerados e nunca finalizados);
 * - remove questões privadas (material do aluno) que não pertencem a nenhum simulado.
 */
async function executarManutencao() {
  try {
    const destravados = await db.query(
      `UPDATE simulados_realizados SET status = 'em_andamento', corrigindo_desde = NULL
       WHERE status = 'corrigindo' AND corrigindo_desde < now() - interval '10 minutes'`,
    );
    const abandonados = await db.query(
      `DELETE FROM simulados_realizados
       WHERE status = 'em_andamento' AND data_criacao < now() - interval '7 days'`,
    );
    const orfas = await db.query(
      `DELETE FROM questoes q
       WHERE q.privada = true
         AND q.data_criacao < now() - interval '7 days'
         AND NOT EXISTS (SELECT 1 FROM historico_respostas h WHERE h.questao_id = q.id)
         AND NOT EXISTS (SELECT 1 FROM simulados_realizados s WHERE q.id = ANY (s.questao_ids))`,
    );
    await db.query(`DELETE FROM limites_uso WHERE expira_em < now()`);
    const total = destravados.rowCount + abandonados.rowCount + orfas.rowCount;
    if (total > 0) {
      console.log(
        `[manutenção] destravados=${destravados.rowCount} abandonados=${abandonados.rowCount} questões órfãs=${orfas.rowCount}`,
      );
    }
  } catch (err) {
    console.error("[manutenção] Falha:", err.message);
  }
}

function agendarManutencao(intervaloMs = 60 * 60 * 1000) {
  executarManutencao();
  // unref: o timer não impede o processo de encerrar.
  setInterval(executarManutencao, intervaloMs).unref();
}

module.exports = { executarManutencao, agendarManutencao };
