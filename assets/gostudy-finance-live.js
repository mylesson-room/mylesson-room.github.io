(() => {
  const auth = window.GoStudyFinanceAuth;
  if (!auth) return;
  const status = document.querySelector("#finance-live-status");
  const words = new Map();
  let room;
  let cursor = 0;
  let caughtUp = false;
  let busy = false;
  let writes = Promise.resolve();
  const roomPath = "/rest/v1/gostudy_finance_room?select=teacher_id,student_id";
  const eventPath = "/rest/v1/gostudy_finance_events";
  async function request(path, options) {
    const response = await auth.request(path, options, await auth.token());
    if (!response.ok) throw Object.assign(new Error("Связь с уроком прервалась."), {status:response.status});
    return response.data;
  }
  function show(message) {
    if (status) status.textContent = message;
  }
  function apply(events, initial) {
    for (const event of events) {
      cursor = event.seq;
      if (event.kind === "word") {
        const word = event.payload;
        if (typeof word.en !== "string" || typeof word.ru !== "string" || !word.en.trim() || !word.ru.trim()) continue;
        const key = word.en.trim().toLowerCase();
        const added = !words.has(key);
        words.set(key, word);
        document.dispatchEvent(new CustomEvent("finance-word", {detail:{word,notify:added && !initial}}));
      } else {
        document.dispatchEvent(new CustomEvent("finance-event", {
          detail:{...event,initial,own:event.actor === auth.userId(),teacher:event.actor === room.teacher_id}
        }));
      }
    }
  }
  async function pull(initial = false) {
    if (busy) return;
    busy = true;
    try {
      if (!room) {
        room = (await request(roomPath))[0];
        if (!room) { show("Для этого аккаунта нет доступа к комнате."); return; }
        document.dispatchEvent(new Event("finance-connect"));
      }
      let batch;
      do {
        batch = await request(eventPath + "?select=seq,actor,kind,payload&order=seq.asc&limit=500&seq=gt." + cursor);
        apply(batch, initial);
      } while (batch.length === 500);
      if (!caughtUp) document.dispatchEvent(new Event("finance-ready"));
      caughtUp = true;
      show("Онлайн · общая комната");
    } catch (error) {
      show(error.message);
    } finally {
      busy = false;
    }
  }
  window.FinanceLive = {
    connected: () => Boolean(room),
    teacher: () => room?.teacher_id === auth.userId(),
    words: () => [...words.values()],
    send(kind, payload) {
      if (!room) return false;
      const event = {id:crypto.randomUUID(),kind,payload};
      const post = async () => {
        try {
          await request(eventPath, {method:"POST",body:event});
        } catch (error) {
          if (error.status !== 409) throw error;
        }
      };
      writes = writes.then(async () => {
        try { await post(); }
        catch (error) {
          if (error.status && error.status < 500) throw error;
          await post();
        }
        await pull(!caughtUp);
      }).catch(error => show(error.message || "Изменение не отправилось."));
      return true;
    }
  };
  if (auth.userId()) {
    let initial = true;
    const poll = async () => { await pull(initial); if (caughtUp) initial = false; };
    poll();
    setInterval(poll, status ? 1000 : 4000);
  } else {
    show("Войдите в GoStudy для совместного урока.");
  }
})();