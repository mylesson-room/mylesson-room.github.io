(() => {
  const privateRoom = window.GoStudyLesson?.privateRoom;
  const auth = privateRoom ? window.GoStudyPrivateAccess : window.GoStudyFinanceAuth;
  if (!auth) return;
  const status = document.querySelector("#finance-live-status");
  const accessStatus = document.querySelector(".classroom-access");
  const course = privateRoom?.course || document.body.dataset.classroomCourse || document.body.dataset.liveCourse;
  const lesson = privateRoom?.lesson || document.body.dataset.classroomLesson;
  const user = auth.userId();
  const selectedStudent = auth.classroomStudent;
  const classroomQuery = course && new URLSearchParams({
    select:"id,teacher_id,student_id,student_label",
    course:"eq."+course,
    lesson_path:"eq."+lesson,
    student_id:"eq."+(privateRoom?.student || selectedStudent || user),
  });
  const words = new Map();
  const removedWords = new Set();
  let room;
  let cursor = 0;
  let caughtUp = false;
  let busy = false;
  let writes = Promise.resolve();
  const roomPath = "/rest/v1/gostudy_finance_room?select=teacher_id,student_id";
  const eventPath = "/rest/v1/gostudy_finance_events";
  async function request(path, options) {
    const response = privateRoom ? await auth.request(path, options) : await auth.request(path, options, await auth.token());
    if (!response.ok) throw Object.assign(new Error("Связь с уроком прервалась."), {status:response.status});
    return response.data;
  }
  function show(message) {
    if (status) status.textContent = message;
    if (accessStatus && !accessStatus.hidden) {
      const text = document.createTextNode(message+" ");
      const link = document.createElement("a");
      link.href = message.includes("доступа") || !user ? "login.html" : location.href;
      link.textContent = link.href === location.href ? "Обновить" : "Войти в GoStudy";
      accessStatus.replaceChildren(text,link);
    }
  }
  function apply(events, initial) {
    for (const event of events) {
      cursor = event.seq;
      // Page navigation is lesson-specific; vocabulary/chat remain shared.
      if (event.kind === "page" && (event.payload?.lessonScope || "") !== (document.body.dataset.pageScope || "")) continue;
      if (event.kind === "word") {
        const word = event.payload;
        if (typeof word.en !== "string" || typeof word.ru !== "string" || !word.en.trim() || !word.ru.trim()) continue;
        const key = word.en.trim().toLowerCase();
        if (word.removed === true) {
          words.delete(key);
          removedWords.add(key);
          document.dispatchEvent(new CustomEvent("finance-word", {detail:{word,notify:false}}));
          continue;
        }
        removedWords.delete(key);
        const added = !words.has(key);
        words.set(key, {...word,learned:words.get(key)?.learned||Boolean(word.learned)});
        document.dispatchEvent(new CustomEvent("finance-word", {detail:{word,notify:added && !initial}}));
      } else if (event.kind === "word_mastered") {
        const key=String(event.payload?.en||"").trim().toLowerCase();
        if(key && words.has(key)){
          words.set(key,{...words.get(key),learned:true});
          document.dispatchEvent(new CustomEvent("finance-word",{detail:{word:words.get(key),notify:false}}));
        }
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
        const list = await request(classroomQuery ? "/rest/v1/gostudy_classroom_rooms?"+classroomQuery : roomPath);
        room = course ? list.find(row => {
          if (privateRoom) return row.student_id === user || row.teacher_id === user;
          return selectedStudent ? row.teacher_id === user : row.student_id === user;
        }) : list[0];
        if (!room) { show("Для этого аккаунта нет доступа к комнате."); return; }
        document.dispatchEvent(new Event("finance-connect"));
      }
      let batch;
      do {
        const path = course ? "/rest/v1/gostudy_classroom_events" : eventPath;
        const filter = course ? "&room_id=eq."+room.id : "";
        batch = await request(path + "?select="+(course?"seq,actor,kind,payload":"seq,actor,kind,payload,created_at")+"&order=seq.asc&limit=500&seq=gt." + cursor + filter);
        apply(batch, initial);
      } while (batch.length === 500);
      if (!caughtUp) {
        if (course && !privateRoom) document.body.classList.add("classroom-authorized");
        if (accessStatus) accessStatus.hidden = true;
        document.dispatchEvent(new CustomEvent("finance-ready",{detail:course ? room : null}));
      }
      caughtUp = true;
      show("Онлайн · общая комната");
    } catch (error) {
      show(error.message);
    } finally {
      busy = false;
    }
  }
  function localWords() {
    const sources = document.body.dataset.vocabularyImportSources?.split(/\s+/).filter(Boolean)
      || (course ? [] : ['gostudy-business-ai-shared-v1']);
    const available = new Map();
    for (const key of sources) {
      try {
        const snapshot = JSON.parse(localStorage.getItem(key) || '{}');
        for (const word of Array.isArray(snapshot.words) ? snapshot.words : []) {
          const en = typeof word?.en === 'string' ? word.en.trim() : '';
          if (en) available.set(en.toLowerCase(),{en,ru:typeof word.ru === 'string' ? word.ru.trim() : ''});
        }
      } catch {}
    }
    return [...available.values()];
  }
  function missingLocalWords() {
    if (room?.student_id !== auth.userId() || !room) return [];
    return localWords().filter(word => word.ru && !words.has(word.en.toLowerCase()) && !removedWords.has(word.en.toLowerCase()));
  }
  window.FinanceLive = {
    connected: () => Boolean(room),
    teacher: () => room?.teacher_id === auth.userId(),
    words() {
      const combined = new Map();
      if (!room || room.student_id === auth.userId()) {
        for (const word of localWords()) {
          const key = word.en.toLowerCase();
          if (!removedWords.has(key)) combined.set(key,word);
        }
      }
      for (const [key,word] of words) combined.set(key,word);
      return [...combined.values()];
    },
    missingLocalWords,
    hasRemovedWord: en => removedWords.has(en.trim().toLowerCase()),
    removeWord(word) {
      if (!caughtUp) return Promise.reject(Error("Словарь ещё подключается."));
      return this.send("word", {en:word.en,ru:word.ru || word.en,removed:true}, true);
    },
    send(kind, payload, awaitSave = false) {
      if (!room) return false;
      if (kind === "page" && document.body.dataset.pageScope) payload={...payload,lessonScope:document.body.dataset.pageScope};
      const event = {id:crypto.randomUUID(),kind,payload};
      const post = async () => {
        try {
          if (course) {
            const saved = await request("/rest/v1/rpc/gostudy_classroom_send", {
              method:"POST",body:{p_room:room.id,p_id:event.id,p_kind:event.kind,p_payload:event.payload}
            });
            if (!saved) throw new Error("Нет доступа к комнате.");
          } else await request(eventPath, {method:"POST",body:event});
        } catch (error) {
          if (error.status !== 409) throw error;
        }
      };
      const saved = writes.then(async () => {
        try { await post(); }
        catch (error) {
          if (error.status && error.status < 500) throw error;
          await post();
        }
        await pull(!caughtUp);
      });
      writes = saved.catch(error => show(error.message || "Изменение не отправилось."));
      return awaitSave ? saved : true;
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