/* BITIKLAR admin: bitik rasmi ustida qatorlar/qismlarni ramka bilan belgilash.
 *
 * Har bir rasm qatorida "✎ Rasmda belgilash" tugmasi paydo bo'ladi. Oynada sichqoncha (yoki barmoq)
 * bilan to'rtburchak chizing, har biriga izoh yozing ("1-qator", "basmala"...). "Saqlash" belgilarni
 * rasmning "annotations" maydoniga JSON ko'rinishida yozadi; keyin sahifani odatdagidek saqlang.
 * Koordinatalar rasm o'lchamiga nisbatan foizda saqlanadi.
 */
(function () {
  "use strict";

  function parse(text) {
    try {
      var v = JSON.parse(text || "[]");
      return Array.isArray(v) ? v : [];
    } catch (e) {
      return [];
    }
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function round(n) { return Math.round(n * 100) / 100; }

  function openEditor(imgUrl, textarea, summary) {
    var boxes = parse(textarea.value);
    var overlay = el("div", "bk-ann-overlay");
    var dialog = el("div", "bk-ann-dialog");
    var head = el("div", "bk-ann-head");
    head.appendChild(el("b", "", "Rasm ustida belgilash"));
    head.appendChild(el("span", "help", " — sichqoncha bilan ramka chizing"));
    var body = el("div", "bk-ann-body");
    var stage = el("div", "bk-ann-stage");
    var img = el("img");
    img.src = imgUrl;
    img.draggable = false;
    stage.appendChild(img);
    var side = el("div", "bk-ann-side");
    var list = el("ol", "bk-ann-list");
    side.appendChild(list);
    var actions = el("div", "bk-ann-actions");
    var save = el("button", "button default", "Saqlash");
    save.type = "button";
    var cancel = el("button", "button", "Bekor qilish");
    cancel.type = "button";
    actions.appendChild(save);
    actions.appendChild(cancel);
    side.appendChild(actions);
    body.appendChild(stage);
    body.appendChild(side);
    dialog.appendChild(head);
    dialog.appendChild(body);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    function render() {
      stage.querySelectorAll(".bk-ann-box").forEach(function (b) { b.remove(); });
      list.innerHTML = "";
      boxes.forEach(function (b, i) {
        var r = el("div", "bk-ann-box");
        r.style.left = b.x + "%";
        r.style.top = b.y + "%";
        r.style.width = b.w + "%";
        r.style.height = b.h + "%";
        r.appendChild(el("span", "", String(i + 1)));
        stage.appendChild(r);

        var li = el("li");
        var input = el("input", "vTextField");
        input.value = b.label || "";
        input.placeholder = "Izoh (masalan: 1-qator)";
        input.addEventListener("input", function () { b.label = input.value; });
        var del = el("button", "button", "✕");
        del.type = "button";
        del.title = "O'chirish";
        del.addEventListener("click", function () { boxes.splice(i, 1); render(); });
        li.appendChild(input);
        li.appendChild(del);
        list.appendChild(li);
      });
      if (!boxes.length) list.appendChild(el("p", "help", "Hali belgi yo'q."));
    }

    var start = null;
    var draft = null;
    function pt(e) {
      var rect = img.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
        y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)),
      };
    }
    stage.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      e.preventDefault();
      stage.setPointerCapture(e.pointerId);
      start = pt(e);
      draft = el("div", "bk-ann-box draft");
      stage.appendChild(draft);
    });
    stage.addEventListener("pointermove", function (e) {
      if (!start) return;
      var p = pt(e);
      draft.style.left = Math.min(start.x, p.x) + "%";
      draft.style.top = Math.min(start.y, p.y) + "%";
      draft.style.width = Math.abs(p.x - start.x) + "%";
      draft.style.height = Math.abs(p.y - start.y) + "%";
    });
    stage.addEventListener("pointerup", function (e) {
      if (!start) return;
      var p = pt(e);
      var b = {
        x: round(Math.min(start.x, p.x)), y: round(Math.min(start.y, p.y)),
        w: round(Math.abs(p.x - start.x)), h: round(Math.abs(p.y - start.y)), label: "",
      };
      start = null;
      if (draft) draft.remove();
      if (b.w > 1 && b.h > 1) {
        boxes.push(b);
        render();
        var inputs = list.querySelectorAll("input");
        if (inputs.length) inputs[inputs.length - 1].focus();
      }
    });

    function close() { overlay.remove(); }
    cancel.addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    save.addEventListener("click", function () {
      textarea.value = JSON.stringify(boxes);
      summary.textContent = boxes.length ? boxes.length + " ta belgi (sahifani saqlang)" : "Belgi yo'q";
      close();
    });
    render();
  }

  function enhance(root) {
    (root || document).querySelectorAll('textarea[name$="-annotations"]').forEach(function (ta) {
      if (ta.dataset.bkReady) return;
      ta.dataset.bkReady = "1";
      var row = ta.closest("tr") || ta.closest(".inline-related");
      var img = row && row.querySelector("img.bk-preview");
      ta.style.display = "none";
      var count = parse(ta.value).length;
      var summary = el("span", "help", count ? count + " ta belgi" : "Belgi yo'q");
      var btn = el("button", "button", "✎ Rasmda belgilash");
      btn.type = "button";
      btn.addEventListener("click", function () {
        var fresh = row && row.querySelector("img.bk-preview");
        if (!fresh) { alert("Avval rasmni yuklab, sahifani saqlang."); return; }
        openEditor(fresh.getAttribute("data-full") || fresh.src, ta, summary);
      });
      if (!img) btn.title = "Rasm saqlangandan keyin ishlaydi";
      ta.parentNode.insertBefore(btn, ta);
      ta.parentNode.insertBefore(document.createTextNode(" "), ta);
      ta.parentNode.insertBefore(summary, ta);
    });
  }

  document.addEventListener("DOMContentLoaded", function () { enhance(); });
  // Yangi inline qator qo'shilganda
  document.addEventListener("formset:added", function (e) { enhance(e.target); });
})();
