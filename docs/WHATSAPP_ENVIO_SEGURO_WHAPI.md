# Envio diário seguro via Whapi – melhores práticas e padrão de mensagem

Documento de pesquisa sobre limites, detecção da Meta e estratégia recomendada (300–500 msgs/dia, intervalo aleatório), **sem uso da API oficial da Meta**.

---

## 1. Resposta direta: a Meta avalia o padrão da mensagem?

**Sim.** A Meta/WhatsApp considera não só **volume e ritmo**, mas também **conteúdo idêntico ou muito parecido**.

### O que a documentação e relatos indicam

- **Whapi (suporte), motivo explícito de bloqueio:**  
  *"Bulk sending of the **same message** to many subscribers"* é uma das causas listadas de bloqueio.  
  Fonte: [How to do mailings without the risk of being blocked](https://support.whapi.cloud/help-desk/blocking/how-to-do-mailings-without-the-risk-of-being-blocked)

- **Comportamento “não humano”:**  
  Enviar *"identical text to many people"* e *"Send messages at **equal intervals**, say, exactly every 5 or 10 seconds"* são citados como ações que disparam alertas.  
  Fonte: [How not to get Banned? – Whapi](https://support.whapi.cloud/help-desk/blocking/how-to-not-get-banned)

- **Outras fontes (APIs não-oficiais):**  
  - Enviar o **mesmo texto** muitas vezes seguidas (ex.: >20 vezes) facilita revisão/bloqueio.  
  - Contas chegam a ser restritas após ~250 mensagens se forem **idênticas ou com padrão previsível**.  
  - **Personalização** (nome, variáveis) e **variação de texto** reduzem detecção (ex.: ~40% de redução na taxa de ban em alguns estudos).

Conclusão: **sim, a Meta avalia o padrão da mensagem.** Não basta só espaçar no tempo (ex.: uma a cada 20 minutos); se forem **iguais ou muito parecidas**, o risco de bloqueio continua alto. O ideal é **volume baixo + intervalo aleatório + mensagens variadas/personalizadas**.

---

## 2. Limites e regras recomendados pelo Whapi

Trechos diretos da documentação Whapi (envio sem risco de bloqueio):

- **Para começar:**  
  - **Máximo 2 mensagens por minuto.**  
  - **Não mais que 6 horas de “atividade” por dia.**  
  - **Não mais que 3 dias seguidos** de envio.  

- **Depois do warm-up:**  
  - Limitar a **6–12 mensagens por minuto** no pico (e mesmo assim com intervalos **aleatórios**, não fixos).

- **Intervalos:**  
  - **Randomizar** as pausas entre mensagens.  
  - Intervalos **iguais** (ex.: exatamente a cada 5 ou 10 segundos) disparam o sistema anti-spam.

- **Engajamento:**  
  - Meta de **~30% de resposta** (30 respostas a cada 100 mensagens enviadas).

- **Conteúdo:**  
  - **Personalizar** (ex.: nome do destinatário).  
  - Variar textos e estilos; evitar “a mesma mensagem” para muitos.

Referências:  
[How to do mailings without the risk of being blocked](https://support.whapi.cloud/help-desk/blocking/how-to-do-mailings-without-the-risk-of-being-blocked),  
[How not to get Banned?](https://support.whapi.cloud/help-desk/blocking/how-to-not-get-banned),  
[Warming Up New Phone Numbers](https://support.whapi.cloud/help-desk/blocking/warming-up-new-phone-numbers-for-whatsapp-api).

---

## 3. Estratégia: 300–500 mensagens/dia, espalhadas no dia

Você tem **86.400 segundos/dia**. Usar **300–500 envios/dia** com **distribuição aleatória** no tempo é uma abordagem conservadora e alinhada às práticas recomendadas.

### Por que faz sentido

- **Volume:** 300–500/dia está abaixo ou no limite do que várias fontes citam para contas “estabelecidas” (ex.: 500–800/dia) e bem abaixo de picos perigosos (ex.: 100+ em 5 min).
- **Ritmo:** Com 400 msgs/dia, a média seria 1 msg a cada **~3,6 min** (216 s). Isso é **bem mais lento** que 2/min e deixa margem para randomizar (ex.: entre 1–8 min entre envios).
- **Aleatoriedade:** Distribuir os horários de envio **aleatoriamente** ao longo do dia reduz padrão “robotizado” (mesmo horário, mesmo intervalo).

### Sugestão de regras no seu sistema (a implementar)

- **Teto diário:** ex.: 300–500 mensagens por campanha/canal por dia (configurável).
- **Janela no dia:** ex.: 8h–22h ou 6h–23h (evitar madrugada).
- **Intervalo entre envios:** **aleatório** dentro de um range, por exemplo:
  - Mínimo: 60–90 s entre mensagens (evitar picos).
  - Máximo: 8–15 min (para não concentrar tudo em poucas horas).
  - Exemplo: sortear cada intervalo entre 90 s e 8 min (em segundos).
- **Conteúdo:** **nunca** enviar a mesma string para todos; usar **personalização** (nome) e **variações** (saudações, frases alternativas) quando possível.

Assim você usa “uma quantidade bem menor (300 a 500 por dia) gerada aleatoriamente no intervalo do dia”, como você descreveu.

---

## 4. Padrão da mensagem: o que evitar e o que fazer

### Evitar

- **Mesma mensagem** para muitos contatos (principalmente em sequência).
- **Intervalos fixos** (ex.: exatamente a cada 20 min ou a cada X segundos).
- **Muitas mensagens em poucos minutos** (ex.: dezenas em 5 min).
- **Vários dias seguidos** de envio em massa sem “respiro” (Whapi sugere não mais que 3 dias seguidos no início).
- Primeira mensagem **só com link**, sem texto personalizado e sem contexto.

### Fazer

- **Personalizar:** pelo menos nome do destinatário (ex.: “Olá, {nome}”).
- **Variar texto:**  
  - Várias “aberturas” (ex.: “Olá,” / “Oi,” / “Bom dia,”).  
  - Pequenas variações no corpo da mensagem (sinônimos, ordem de frases), se fizer sentido para o negócio.
- **Randomizar intervalo** entre cada envio (em segundos/minutos), dentro do range definido.
- **Limitar envios por dia** (ex.: 300–500) e **distribuir no dia** (janela de 12–18 h, por exemplo).
- Incluir **opção de opt-out** (ex.: “Responda STOP para não receber”) e **pergunta ou call-to-action** para aumentar chance de resposta (~30% de respostas é a meta citada).
- Quando possível, **agrupar por DDD/região** (Whapi recomenda contatos na mesma área do número).

Isso responde: **sim, a Meta avalia o padrão**; mesmo com 1 msg a cada 20 min, se forem **iguais ou muito parecidas**, o risco continua. A abordagem correta é **mensagens variadas/personalizadas + intervalo aleatório + volume moderado**.

---

## 5. Resumo prático

| Aspecto | Recomendação |
|--------|----------------|
| **Volume diário** | 300–500 mensagens/dia (conservador). |
| **Distribuição** | Aleatória ao longo do dia (ex.: janela 8h–22h). |
| **Intervalo entre envios** | Aleatório (ex.: 90 s a 8 min), nunca fixo. |
| **Conteúdo** | Sempre personalizado (nome) e com variações de texto quando possível. |
| **Ritmo máximo (Whapi “início”)** | Até 2 msgs/min; após warm-up, até 6–12/min com intervalos aleatórios. |
| **Dias seguidos** | Evitar mais de 3 dias seguidos de campanha pesada no início. |
| **Meta de engajamento** | ~30% de respostas (ajuda a reduzir risco de bloqueio). |

---

## 6. Situação atual do seu código (referência)

No `run-campaigns` hoje:

- Há **delay fixo** entre envios (`delayMs` derivado de `envios_por_minuto`, mínimo 1,5 s).
- Não há **randomização** do intervalo.
- A **mesma** `mensagem_texto` é usada para todos os destinatários da campanha.

Para alinhar à estratégia acima, seriam necessárias alterações (fora do escopo deste doc):

- **Teto diário** por campanha/canal.
- **Horários de envio** sorteados dentro de uma janela diária (ou fila com timestamps aleatórios).
- **Intervalo aleatório** entre cada envio (min/max em segundos).
- **Personalização/variação** da mensagem (nome + variações de texto) por destinatário.

---

*Documento apenas de pesquisa e boas práticas; não altera código. Última atualização com base na documentação Whapi e em práticas citadas para APIs não-oficiais (2024–2025).*
