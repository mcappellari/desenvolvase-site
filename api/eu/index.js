/**
 * GET /api/eu — diz quem é a pessoa que está acessando e o que ela pode fazer.
 *
 * O Static Web Apps trata a autenticação: quando alguém entra pela conta
 * Microsoft, a plataforma injeta o cabeçalho "x-ms-client-principal" em toda
 * chamada à API. Não há token para validar aqui — se o cabeçalho existe, a
 * plataforma já conferiu a identidade.
 *
 * O que a plataforma NÃO faz é dizer quem *pode* entrar. O provedor pronto da
 * Microsoft aceita qualquer conta Microsoft do mundo, inclusive pessoal. Quem
 * decide o acesso é a lista de autorizados lida aqui — e é por isso que essa
 * checagem mora na API, e não na tela: esconder botão não impede ninguém de
 * chamar o endereço direto.
 */

/** Lê a identidade que o Static Web Apps anexou à requisição. */
function lerPrincipal(req) {
  const cabecalho = req.headers["x-ms-client-principal"];
  if (!cabecalho) return null;
  try {
    return JSON.parse(Buffer.from(cabecalho, "base64").toString("utf8"));
  } catch (erro) {
    return null;
  }
}

/**
 * A lista de autorizados, vinda da configuração do aplicativo.
 *
 * Formato: "email:papel:ramos" separados por ponto e vírgula, onde ramos é uma
 * lista separada por vírgula, ou "*" para todos.
 *
 *   fulano@exemplo.org:coordenacao:*;beltrano@exemplo.org:professor:musica
 *
 * Esta é a única parte provisória desta fatia: assim que a planilha de
 * frequência existir, a lista passa a sair de uma aba "usuarios" e a
 * coordenação administra o acesso sem mexer em configuração do Azure. A
 * assinatura desta função não muda quando isso acontecer.
 */
function carregarAutorizados() {
  const bruto = process.env.USUARIOS_AUTORIZADOS || "";
  return bruto
    .split(";")
    .map((linha) => linha.trim())
    .filter(Boolean)
    .map((linha) => {
      const partes = linha.split(":");
      const email = (partes[0] || "").toLowerCase().trim();
      const papel = (partes[1] || "professor").trim();
      const ramos = (partes[2] || "").trim();
      return {
        email: email,
        papel: papel,
        ramos: ramos === "*"
          ? "*"
          : ramos.split(",").map((r) => r.trim()).filter(Boolean),
      };
    })
    .filter((u) => u.email);
}

function responder(context, status, corpo) {
  context.res = {
    status: status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      /* a resposta é pessoal e muda conforme quem chama: nenhum intermediário
         deve guardá-la */
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(corpo),
  };
}

module.exports = async function (context, req) {
  const principal = lerPrincipal(req);

  if (!principal || !principal.userDetails) {
    responder(context, 401, {
      autenticado: false,
      mensagem: "Entre com sua conta Microsoft para continuar.",
    });
    return;
  }

  const email = principal.userDetails.toLowerCase().trim();
  const autorizados = carregarAutorizados();
  const usuario = autorizados.find((u) => u.email === email);

  if (!usuario) {
    /* Autenticado, mas não autorizado. A distinção importa: a pessoa provou
       quem é, então a mensagem pode dizer o que fazer em vez de só negar. */
    responder(context, 403, {
      autenticado: true,
      autorizado: false,
      email: email,
      mensagem:
        "Sua conta foi reconhecida, mas ainda não tem acesso ao sistema. " +
        "Peça à coordenação para incluir este e-mail.",
    });
    return;
  }

  responder(context, 200, {
    autenticado: true,
    autorizado: true,
    email: usuario.email,
    papel: usuario.papel,
    ramos: usuario.ramos,
    provedor: principal.identityProvider,
  });
};
