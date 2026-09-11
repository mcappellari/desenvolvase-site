# Desenvolva-se — Guia de Configuração do Site

Este site é estático (HTML/CSS/JS puro) e funciona em qualquer hospedagem,
inclusive a que vocês já possuem hoje. Não precisa de Node.js, PHP ou banco
de dados próprio.

## 1. Como visualizar localmente

Abrir os arquivos `.html` direto no navegador (duplo clique) funciona para
ver o layout, mas os formulários só funcionam quando o site está publicado
em um servidor real (http/https), por causa de regras de segurança do
navegador. Para testar tudo, publique em uma hospedagem de teste ou peça
para o Claude Code rodar um servidor local simples.

## 2. Pendências de conteúdo

Marcadas no código com comentários `<!-- TODO -->` ou textos entre colchetes
`[ ... ]`:

- **Logo real** — hoje o cabeçalho usa texto "Desenvolva-se". Assim que
  vocês enviarem o arquivo do logo, ele pode substituir o texto em todas
  as páginas (`<a href="index.html" class="logo">`).
- **Fotos reais** — todo bloco marcado como `[ Foto ... substituir ]` ou
  `.instagram-grid .ph` é um placeholder. Substituir por fotos reais das
  atividades (podem vir do Instagram @desenvolvase.projeto, baixadas
  manualmente, já que o Instagram não permite baixar fotos automaticamente).
- **Texto literal de "Nossa História" e "Objetivos"** — em `quem-somos.html`,
  os textos foram resumidos a partir do site atual. O ideal é colar o texto
  oficial e completo que vocês já têm.
- **Cores da marca** — a paleta de verde/laranja em `css/style.css`
  (bloco `:root` no topo do arquivo) é um placeholder. Basta trocar os
  valores hexadecimais quando tiverem o manual de marca.
- **Horários de turmas de música** — em `musica.html`, atualizar conforme
  as turmas ativas no semestre.

## 3. Conectar os formulários ao Google Sheets

O site tem 9 formulários, e **cada um grava em uma planilha própria** (não
em abas dentro de uma planilha só): `matricula-informatica`,
`matricula-musica`, `ticonectars-doacao`, `ticonectars-solicitacao`,
`acao-social`, `voluntario`, `cadastro-alunos`, `contribua`, `contato`.
Todos já enviam os dados prontos em JSON — falta criar as planilhas e
apontar o script para cada uma. Passo a passo:

1. Crie **9 planilhas novas** no Google Sheets, uma para cada formulário
   acima (ex: "Desenvolva-se — Matrícula Informática", "Desenvolva-se —
   tiConectaRS Doação", etc.). Pode nomear como preferir — o que importa é
   o ID de cada uma.
2. Para pegar o ID de uma planilha, olhe a URL dela no navegador:
   `https://docs.google.com/spreadsheets/d/ESTE_TRECHO_AQUI_E_O_ID/edit`.
3. Em **qualquer uma** dessas planilhas (só precisa de uma, o script não
   fica "preso" a ela), vá em **Extensões → Apps Script**.
4. Apague o conteúdo padrão e cole o script abaixo, substituindo cada
   `ID_DA_PLANILHA_...` pelo ID real da planilha correspondente:

   ```javascript
   var PLANILHAS = {
     "matricula-informatica": "ID_DA_PLANILHA_INFORMATICA",
     "matricula-musica": "ID_DA_PLANILHA_MUSICA",
     "ticonectars-doacao": "ID_DA_PLANILHA_TICONECTARS_DOACAO",
     "ticonectars-solicitacao": "ID_DA_PLANILHA_TICONECTARS_SOLICITACAO",
     "acao-social": "ID_DA_PLANILHA_ACAO_SOCIAL",
     "voluntario": "ID_DA_PLANILHA_VOLUNTARIO",
     "cadastro-alunos": "ID_DA_PLANILHA_CADASTRO_ALUNOS",
     "contribua": "ID_DA_PLANILHA_CONTRIBUA",
     "contato": "ID_DA_PLANILHA_CONTATO"
   };

   function doPost(e) {
     var dados = JSON.parse(e.postData.contents);
     var formulario = dados.formulario || "";
     var idPlanilha = PLANILHAS[formulario];

     if (!idPlanilha) {
       return ContentService.createTextOutput("Formulário desconhecido: " + formulario);
     }

     var planilha = SpreadsheetApp.openById(idPlanilha);
     var aba = planilha.getSheets()[0];

     if (aba.getLastRow() === 0) {
       aba.appendRow(Object.keys(dados)); // cabeçalho na primeira vez
     }
     aba.appendRow(Object.values(dados));

     return ContentService.createTextOutput("OK");
   }
   ```

5. Clique em **Implantar → Nova implantação**.
6. Tipo: **App da Web**. Executar como: **Eu**. Quem pode acessar:
   **Qualquer pessoa**.
7. Implante e copie a URL gerada (termina em `/exec`).
8. Abra `js/main.js` e substitua a linha:

   ```javascript
   const GOOGLE_SCRIPT_URL = "COLE_AQUI_A_URL_DO_APPS_SCRIPT";
   ```

   pela URL copiada. Essa é a **única** URL usada pelo site inteiro — o
   próprio script decide, com base no formulário enviado, em qual das 9
   planilhas gravar a linha.

9. Publique o site novamente. Cada envio de formulário vai gravar uma
   linha na planilha correspondente àquele formulário.

## 4. Publicar na hospedagem existente

Como o site é só HTML/CSS/JS, basta enviar todos os arquivos desta pasta
(`index.html`, as demais páginas, `css/`, `js/`) para a raiz do domínio
via FTP/painel da hospedagem que vocês já usam — sem nenhuma configuração
especial de servidor.

## 5. Feed automático do Instagram

A seção "No Instagram" da página inicial (`index.html`) hoje mostra 4
links fixos como substituto temporário. Para ela puxar as fotos mais
recentes de @desenvolvase.projeto automaticamente, sem precisar de
servidor próprio, use um widget de terceiros:

1. Crie uma conta em [behold.so](https://behold.so) (recomendado — tem
   plano gratuito e visual limpo) ou em [snapwidget.com](https://snapwidget.com)
   como alternativa.
2. Conecte a conta do Instagram @desenvolvase.projeto pelo painel do
   serviço (é um login direto com o Instagram/Facebook de vocês — nós
   não temos acesso a essa senha, então esse passo só vocês conseguem
   fazer).
3. Configure o feed (quantidade de fotos, colunas, cores) e copie o
   código de incorporação (`<script>` ou `<iframe>`) que o serviço
   gerar.
4. Abra `index.html`, encontre o comentário
   `<!-- Feed automático do Instagram: ... -->` (seção "No Instagram")
   e substitua todo o bloco `<div class="instagram-grid">...</div>`
   logo abaixo dele pelo código copiado.
5. Publique o site novamente (repita o passo 4 acima). A partir daí,
   sempre que uma nova foto for postada no Instagram, ela aparece no
   site automaticamente — sem precisar editar nada.

**Por que não busco direto na API do Instagram?** A Meta descontinuou
o caminho mais simples (Instagram Basic Display API). O caminho oficial
que resta exige conta comercial vinculada a uma Página do Facebook, um
app registrado no Meta for Developers, e um processo rodando por conta
própria para renovar o token de acesso periodicamente — ou seja,
reintroduziria a necessidade de um servidor, o que vocês decidiram
evitar. Um widget de terceiros resolve isso sem abrir mão do site 100%
estático.
