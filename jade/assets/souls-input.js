export const ACTIONS = { left: '向左', right: '向右', jump: '跳跃 / 二段跳', attack: '普通攻击', dash: '闪避 / 追击', guard: '格挡 / 精准反击', interact: '进入星门', overdrive: '觉醒', weapon1: '切换短刃', weapon2: '切换法杖', weapon3: '切换飞轮', pause: '暂停' };
export const DEFAULT_BINDINGS = { left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], jump: ['Space', 'KeyK', 'KeyW', 'ArrowUp', 'KeyZ'], attack: ['KeyJ', 'KeyX'], dash: ['ShiftLeft', 'ShiftRight', 'KeyL'], guard: ['KeyF'], interact: ['KeyE'], overdrive: ['KeyQ'], weapon1: ['Digit1'], weapon2: ['Digit2'], weapon3: ['Digit3'], pause: ['KeyP'] };
const STORE = 'starhop.bindings.v5';
export const keyName = code => ({ Space: '空格', ShiftLeft: '左 Shift', ShiftRight: '右 Shift', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓' })[code] || code.replace(/^Key|^Digit/, '');

export class SoulsInput {
  held = new Map(); edges = new Set(); gamepadLast = []; joystickAxis = 0; joystickPointer = null; captureAction = null;
  constructor(active, shortcut, rotated = () => false) {
    this.active = active; this.shortcut = shortcut; this.rotated = rotated;
    this.bindings = structuredClone(DEFAULT_BINDINGS);
    try {
      const saved = JSON.parse(localStorage.getItem(STORE));
      const used = new Set();
      if (saved && Object.keys(ACTIONS).every(action => Array.isArray(saved[action]) && saved[action].length && saved[action].every(code => typeof code === 'string' && /^(Key[A-Z]|Digit[0-9]|Arrow(Left|Right|Up|Down)|Space|Shift(Left|Right)|Control(Left|Right))$/.test(code) && !used.has(code) && used.add(code)))) this.bindings = saved;
    } catch {}
    window.addEventListener('keydown', event => this.keydown(event), true);
    window.addEventListener('keyup', event => this.held.delete(event.code));
    window.addEventListener('blur', () => this.clear());
    window.addEventListener('resize', () => this.clear());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.clear(); });
    document.addEventListener('click', event => {
      const button = event.target.closest('[data-bind]');
      if (button) { this.clear(); this.captureAction = button.dataset.bind; this.bindingStatus('按下新按键，Esc 取消'); button.textContent = '等待按键…'; }
      if (event.target.closest('[data-reset-bindings]')) { this.captureAction = null; this.bindings = structuredClone(DEFAULT_BINDINGS); this.save(); this.refreshBindings(); this.bindingStatus('已恢复默认键位'); }
    });
    document.querySelectorAll('[data-touch]').forEach(button => {
      const action = button.dataset.touch;
      if (action === 'joystick') { this.setupJoystick(button); return; }
      button.addEventListener('pointerdown', event => {
        if (!this.active()) return;
        event.preventDefault(); button.setPointerCapture(event.pointerId);
        this.held.set(`pointer-${event.pointerId}`, action); this.edges.add(action); button.classList.add('pressed');
      });
      const release = event => { this.held.delete(`pointer-${event.pointerId}`); button.classList.remove('pressed'); };
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, release);
    });
  }
  bindingStatus(text) { const status = document.getElementById('binding-status'); if (status) status.textContent = text; }
  save() { try { localStorage.setItem(STORE, JSON.stringify(this.bindings)); } catch { this.bindingStatus('本次已生效，浏览器不允许保存设置'); } }
  refreshBindings() {
    for (const button of document.querySelectorAll('[data-bind]')) button.textContent = this.captureAction === button.dataset.bind ? '等待按键…' : this.bindings[button.dataset.bind].map(keyName).join(' / ');
    for (const label of document.querySelectorAll('[data-key-label]')) label.textContent = keyName(this.bindings[label.dataset.keyLabel][0]);
  }
  settingsHTML() {
    return `<section class="key-settings"><h3>键盘自定义</h3><p>点选动作，再按新键。Esc 始终可暂停或关闭窗口。</p><div class="key-binding-grid">${Object.entries(ACTIONS).map(([action, name]) => `<label>${name}<button type="button" data-bind="${action}" aria-label="修改${name}键位">${this.bindings[action].map(keyName).join(' / ')}</button></label>`).join('')}</div><p id="binding-status" role="status" aria-live="polite">设置自动保存在当前浏览器。</p><button class="text-button" data-reset-bindings>恢复默认键位</button></section>`;
  }
  keydown(event) {
    if (this.captureAction && document.querySelector('[data-bind]')) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (event.code === 'Escape') { this.captureAction = null; this.refreshBindings(); this.bindingStatus('已取消'); return; }
      if (!/^(Key[A-Z]|Digit[0-9]|Arrow(Left|Right|Up|Down)|Space|Shift(Left|Right)|Control(Left|Right))$/.test(event.code)) { this.bindingStatus('请选择字母、数字、方向键、空格、Shift 或 Ctrl'); return; }
      const conflict = Object.keys(ACTIONS).find(action => action !== this.captureAction && this.bindings[action].includes(event.code));
      if (conflict) { this.bindingStatus(`此键已用于「${ACTIONS[conflict]}」，请换一个键`); return; }
      this.bindings[this.captureAction] = [event.code]; this.captureAction = null;
      this.save(); this.refreshBindings(); this.bindingStatus('新键位已保存'); return;
    }
    this.captureAction = null;
    if (event.target.closest('input,textarea,select,[contenteditable]')) return;
    if (event.code === 'Escape') { if (!event.repeat) this.shortcut('Escape'); event.preventDefault(); this.clear(); return; }
    if (event.ctrlKey && !event.code.startsWith('Control')) return;
    const action = Object.keys(this.bindings).find(action => this.bindings[action].includes(event.code));
    if (!action) return;
    if (action === 'pause') { if (!event.repeat) this.shortcut('KeyP'); event.preventDefault(); this.clear(); return; }
    if (action.startsWith('weapon')) { if (!event.repeat && this.active()) this.shortcut(`Digit${action.at(-1)}`); if (this.active()) event.preventDefault(); return; }
    if (!this.active()) return;
    event.preventDefault();
    if (!this.held.has(event.code)) this.edges.add(action);
    this.held.set(event.code, action);
  }
  setupJoystick(element) {
    this.joystick = element;
    const move = event => {
      if (event.pointerId !== this.joystickPointer) return;
      const box = element.getBoundingClientRect();
      let dx = event.clientX - box.left - box.width / 2, dy = event.clientY - box.top - box.height / 2;
      if (this.rotated()) [dx, dy] = [dy, -dx];
      const radius = Math.min(box.width, box.height) * .34;
      const distance = Math.hypot(dx, dy), factor = Math.min(1, radius / (distance || 1));
      dx *= factor; dy *= factor;
      const x = dx / radius;
      this.joystickAxis = Math.abs(x) < .18 ? 0 : Math.sign(x) * (Math.abs(x) - .18) / .82;
      element.style.setProperty('--stick-x', `${dx}px`); element.style.setProperty('--stick-y', `${dy}px`);
    };
    element.addEventListener('pointerdown', event => {
      if (!this.active() || this.joystickPointer !== null) return;
      event.preventDefault(); this.joystickPointer = event.pointerId; element.setPointerCapture(event.pointerId); element.classList.add('pressed'); move(event);
    });
    element.addEventListener('pointermove', move);
    const release = event => { if (event.pointerId === this.joystickPointer) this.resetJoystick(); };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) element.addEventListener(type, release);
  }
  resetJoystick() {
    this.joystickAxis = 0; this.joystickPointer = null;
    this.joystick?.style.setProperty('--stick-x', '0px'); this.joystick?.style.setProperty('--stick-y', '0px'); this.joystick?.classList.remove('pressed');
  }
  read() {
    const values = [...this.held.values()];
    const input = { left: values.includes('left'), right: values.includes('right'), moveX: this.joystickAxis, jumpHeld: values.includes('jump'), attackHeld: values.includes('attack'), guardHeld: values.includes('guard') };
    for (const name of ['jump', 'attack', 'dash', 'interact', 'overdrive', 'guard']) input[`${name}Pressed`] = this.edges.has(name);
    this.edges.clear();
    if (this.active()) {
      const pad = navigator.getGamepads?.()?.[0];
      if (pad) {
        const axis = pad.axes[0] || 0;
        if (Math.abs(axis) > .18) input.moveX = axis;
        input.left ||= !!pad.buttons[14]?.pressed; input.right ||= !!pad.buttons[15]?.pressed;
        const pressed = [pad.buttons[0]?.pressed, pad.buttons[2]?.pressed || pad.buttons[7]?.pressed, pad.buttons[1]?.pressed, pad.buttons[3]?.pressed, pad.buttons[4]?.pressed, pad.buttons[5]?.pressed];
        ['jump', 'attack', 'dash', 'interact', 'overdrive', 'guard'].forEach((name, i) => { input[`${name}Pressed`] ||= !!pressed[i] && !this.gamepadLast[i]; });
        input.jumpHeld ||= !!pressed[0]; input.attackHeld ||= !!pressed[1]; input.guardHeld ||= !!pressed[5]; this.gamepadLast = pressed;
      } else this.gamepadLast = [];
    }
    return input;
  }
  trigger(action) { if (this.active()) this.edges.add(action); }
  clear() { this.held.clear(); this.edges.clear(); this.gamepadLast = []; this.resetJoystick(); document.querySelectorAll('.pressed').forEach(e => e.classList.remove('pressed')); }
}
