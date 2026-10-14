/* ============================================================
 * 存檔管理模塊
 * 使用 localStorage 持久化；失敗時回退到記憶體 + 文本匯出
 * ============================================================ */

const SAVE_PREFIX = "hakugari_au_save_";
const SAVE_INDEX = "hakugari_au_save_index";

const SaveSystem = {
  // 是否可用 localStorage
  isAvailable() {
    try {
      const t = "__test__" + Date.now();
      localStorage.setItem(t, "1");
      localStorage.removeItem(t);
      return true;
    } catch (e) {
      return false;
    }
  },

  // 讀取存檔索引（陣列）
  getIndex() {
    if (!this.isAvailable()) return [];
    try {
      const raw = localStorage.getItem(SAVE_INDEX);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  // 列出所有存檔
  listSaves() {
    return this.getIndex();
  },

  // 建立新存檔
  createSave(gameState, scene, dialogueHistory, summary) {
    const id = "save_" + Date.now();
    const slot = {
      id,
      name: summary && summary.name ? summary.name : "存檔 " + new Date().toLocaleString("zh-TW"),
      chapter: gameState.chapter,
      chapterTitle: gameState.chapterTitle,
      sceneTitle: scene.sceneTitle,
      location: scene.location,
      time: scene.time,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      memo: summary && summary.memo ? summary.memo : "",
    };
    const data = {
      slot,
      gameState,
      scene,
      dialogueHistory,
    };
    if (this.isAvailable()) {
      try {
        const idx = this.getIndex();
        idx.unshift(slot);
        localStorage.setItem(SAVE_INDEX, JSON.stringify(idx));
        localStorage.setItem(SAVE_PREFIX + id, JSON.stringify(data));
        return { ok: true, id, persisted: "localStorage" };
      } catch (e) {
        return { ok: false, error: "存檔失敗：" + e.message };
      }
    }
    // 回退：回傳可匯出的文字
    return {
      ok: true,
      id,
      persisted: "memory",
      exportText: JSON.stringify(data, null, 2),
    };
  },

  // 讀取存檔
  loadSave(id) {
    if (!this.isAvailable()) return { ok: false, error: "本環境不支援本地存檔，請使用匯入功能。" };
    try {
      const raw = localStorage.getItem(SAVE_PREFIX + id);
      if (!raw) return { ok: false, error: "找不到該存檔。" };
      return { ok: true, data: JSON.parse(raw) };
    } catch (e) {
      return { ok: false, error: "存檔讀取失敗：" + e.message };
    }
  },

  // 覆蓋存檔
  overwriteSave(id, gameState, scene, dialogueHistory) {
    if (!this.isAvailable()) return { ok: false, error: "本環境不支援本地存檔。" };
    try {
      const raw = localStorage.getItem(SAVE_PREFIX + id);
      if (!raw) return { ok: false, error: "找不到該存檔。" };
      const data = JSON.parse(raw);
      data.gameState = gameState;
      data.scene = scene;
      data.dialogueHistory = dialogueHistory;
      data.slot.updatedAt = new Date().toISOString();
      data.slot.chapter = gameState.chapter;
      data.slot.chapterTitle = gameState.chapterTitle;
      data.slot.sceneTitle = scene.sceneTitle;
      data.slot.location = scene.location;
      data.slot.time = scene.time;

      localStorage.setItem(SAVE_PREFIX + id, JSON.stringify(data));
      // 更新索引
      const idx = this.getIndex();
      const t = idx.find((s) => s.id === id);
      if (t) {
        Object.assign(t, data.slot);
        localStorage.setItem(SAVE_INDEX, JSON.stringify(idx));
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: "覆蓋失敗：" + e.message };
    }
  },

  // 刪除存檔
  deleteSave(id) {
    if (!this.isAvailable()) return { ok: false, error: "本環境不支援本地存檔。" };
    try {
      localStorage.removeItem(SAVE_PREFIX + id);
      let idx = this.getIndex();
      idx = idx.filter((s) => s.id !== id);
      localStorage.setItem(SAVE_INDEX, JSON.stringify(idx));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: "刪除失敗：" + e.message };
    }
  },

  // 匯出文字
  exportSave(id) {
    if (!this.isAvailable()) return { ok: false, error: "無可匯出的本地存檔。" };
    const raw = localStorage.getItem(SAVE_PREFIX + id);
    if (!raw) return { ok: false, error: "找不到該存檔。" };
    return { ok: true, text: raw };
  },

  // 匯入文字
  importSave(text) {
    try {
      const data = JSON.parse(text);
      if (!data || !data.slot || !data.gameState) {
        return { ok: false, error: "存檔格式不正確。" };
      }
      const id = "save_" + Date.now();
      data.slot.id = id;
      data.slot.importedAt = new Date().toISOString();
      if (this.isAvailable()) {
        const idx = this.getIndex();
        idx.unshift(data.slot);
        localStorage.setItem(SAVE_INDEX, JSON.stringify(idx));
        localStorage.setItem(SAVE_PREFIX + id, JSON.stringify(data));
        return { ok: true, id, persisted: "localStorage" };
      }
      return { ok: true, id, persisted: "memory", exportText: JSON.stringify(data, null, 2) };
    } catch (e) {
      return { ok: false, error: "匯入失敗：文字不是有效的存檔 JSON。" };
    }
  },
};

// 匯出（Node 環境）
if (typeof module !== "undefined") {
  module.exports = { SaveSystem };
}
