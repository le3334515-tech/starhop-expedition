import { WEAPONS, actionPhase, attackBox, intersects } from './combat-actions.js';
import { createTrialMap } from './trial-map.js';
import { installMonsterAI } from './monster-ai.js';
import { installForestRuntime } from './forest-runtime.js';
import { installCombatVfx } from './combat-vfx.js';
import { installHeroAnimation, weaponMuzzle } from './hero-animation.js';
import { installRunSystems } from './run-systems.js';
import { installCampaignRuntime } from './campaign-runtime.js';

export function installCombatRuntime(Engine,upgradePool) {
  const p = Engine.prototype;
  const base = Object.fromEntries(['start', 'nextRoom', 'step', 'updateHero', 'hurtHero', 'hitEnemy', 'hitBoss', 'equipWeapon', 'offerUpgrade', 'chooseUpgrade'].map(name => [name, p[name]]));
  p.initSoulsHero = function () {
    Object.assign(this.state.hero, { stamina: 100, staminaDelay: 0, guardAge: 0, guardCooldown: 0, guardBuffer: 0, guardBroken: 0, blocking: false, attackBuffer: 0, dodgeBuffer: 0, dodgeStrike: 0, parryRiposte: 0, hurtLock: 0, action: null, actionPhase: 'idle', attackAnimProgress: 0, catchBoost: 0, queuedWeapon: null, critChance: 0 });
    this.dodgeHits = new Set(); this.actionSerial = 0;
  };
  p.start = function (options) {
    base.start.call(this, options); this.initSoulsHero();
    if (options.mode !== 'expedition') {
      Object.assign(this.state, createTrialMap(options.seed), { roomCount: 1, roomIndex: 0, boss: null, announcement: '灰烬回廊 · 上层藏珍，前方精英', announcementTimer: 3 });
    }
  };
  p.nextRoom = function () {
    if (this.state.trial) { this.finish(true); return; }
    base.nextRoom.call(this); this.initSoulsHero();
  };
  p.cancelAction = function () {
    const h = this.state.hero;
    h.action = null; h.attackTimer = 0; h.attackCooldown = 0; h.actionPhase = 'idle'; h.attackAnimProgress = 0;
  };
  p.canCancelAction = function (kind='dodge') { const a = this.state.hero.action; return !a || a.age >= (a.spec.cancel?.[kind] ?? a.spec.cancelAfter); };
  p.equipWeapon = function (weapon) {
    const h = this.state.hero;
    if (!['blade', 'ember', 'disc'].includes(weapon)) return;
    if (!this.canCancelAction('weapon')) { h.queuedWeapon = weapon; return; }
    this.cancelAction(); h.queuedWeapon = null; base.equipWeapon.call(this, weapon);
  };
  p.spendStamina = function (amount) {
    const h = this.state.hero;
    if (h.stamina + .001 < amount) return false;
    h.stamina = Math.max(0, h.stamina - amount); h.staminaDelay = .28; return true;
  };
  p.beginDodge = function () {
    const h = this.state.hero;
    if (!this.canCancelAction() || h.hurtLock > 0 || !this.spendStamina(20)) return false;
    this.cancelAction(); h.dashTimer = .18;
    h.dashCooldown = this.state.overdrive > 0 ? .32 : Math.max(.4, .65 - h.upgrades.filter(x => x === 'stride').length * .07);
    h.invincible = Math.max(h.invincible, .22); h.dodgeStrike = .8; h.dodgeBuffer = 0; h.blocking = false;
    this.dodgeHits.clear(); this.variableJump = false;
    this.sound('dash'); this.burst(h.x + 14, h.y + 20, '#8ee9de', 10, 120); return true;
  };
  p.attack = function (input = {}) {
    const h = this.state.hero, weapon = WEAPONS[h.weapon];
    if (!weapon || h.hurtLock > 0 || h.guardBroken > 0 || h.dashTimer > .10) return false;
    if (h.action && h.action.age < h.action.spec.comboAfter) return false;
    const inFlight = this.state.projectiles.filter(shot => shot.owner === 'hero' && shot.kind === 'disc' && shot.life > 0);
    if (h.weapon === 'disc' && inFlight.length >= 1 + Math.min(2, h.extraProjectiles + Number(this.state.synergies.includes('fireflies')))) {
      if (h.recallRequested || input.attackPressed || !input.attackHeld) {
        for (const shot of inFlight) this.returnDisc(shot);
        h.attackBuffer = 0; h.recallRequested = false; this.label(h.x + 14, h.y - 24, '飞轮召回', '#d1bdff');
      }
      return false;
    }
    const step = h.weapon === 'blade' ? (h.comboWindow > 0 ? h.attackStep % 3 : 0) : 0;
    const spec = { ...weapon.strikes[step], cancel:{...weapon.strikes[step].cancel} };
    if (!this.spendStamina(weapon.cost)) return false;
    if (h.dashTimer > 0) { h.dashTimer = 0; h.invincible = Math.min(h.invincible, .1); }
    const chase = h.dodgeStrike > 0, riposte = h.parryRiposte > 0;
    this.attackPower = (chase || h.swapBoost > 0 ? 1.3 : 1) * (riposte || h.counterTimer > 0 ? 1.65 : 1) * (h.catchBoost > 0 ? 1.15 : 1);
    h.action = { id: ++this.actionSerial, weapon: h.weapon, spec, age: 0, phase: 'startup', facing: h.facing, hitTargets: new Set(), released: false, power: this.attackPower, charged: false, heldAtStart: !!input.attackHeld, chase };
    h.attackStep = step + 1; h.comboWindow = .95; h.attackBuffer = 0; h.blocking = false;
    h.swapBoost = h.counterTimer = h.dodgeStrike = h.parryRiposte = h.catchBoost = 0;
    h.attackCooldown = spec.startup + spec.active + spec.recovery;
    h.attackTimer = h.attackCooldown;
    if (chase || riposte) this.label(h.x + 14, h.y - 24, riposte ? '精准反击' : '闪身追击', '#ffe2a0');
    if (h.weapon === 'ember') this.sound('select');
    return true;
  };
  p.tryBufferedAttack = function (input = {}) {
    const h = this.state.hero;
    if (h.attackBuffer <= 0 || h.blocking || h.guardBroken > 0 || h.hurtLock > 0 || h.dashTimer > .10) return;
    this.attack(input);
  };
  p.advanceAction = function (dt, input) {
    const h = this.state.hero, a = h.action;
    if (!a) { h.actionPhase = h.dashTimer > 0 ? 'dodge' : 'idle'; return; }
    const speed = Math.min(1.8, h.attackSpeed * (this.state.overdrive > 0 ? 1.35 : 1));
    a.age += dt * speed;
    if (a.spec.charge && !a.released) {
      if (!input.attackHeld && a.age >= .06 && a.age < a.spec.startup) {
        a.spec.startup = a.age;
        a.spec.cancelAfter = a.age + .06; a.spec.comboAfter = a.age + .17;
        a.spec.cancel={dodge:a.age+.06,guard:a.age+.06,jump:a.age+.08,weapon:a.age+.1};
      }
      if (a.age >= a.spec.startup) a.charged = a.spec.startup >= .45 && this.spendStamina(5);
    }
    a.phase = actionPhase(a); h.actionPhase = a.phase;
    if (a.phase === 'done') { this.cancelAction(); return; }
    const { startup, active, recovery } = a.spec;
    h.attackAnimProgress = a.phase === 'startup' ? a.age / startup * .36 : a.phase === 'active' ? .36 + (a.age - startup) / active * .30 : .66 + (a.age - startup - active) / recovery * .34;
    h.attackTimer = Math.max(.001, startup + active + recovery - a.age);
    h.attackCooldown = h.attackTimer;
    if (a.phase === 'active' && !a.released) {
      a.released = true;
      this.sound(a.weapon === 'ember' ? 'fire' : a.spec.heavy ? 'heavy' : 'attack');
      if (a.weapon !== 'blade') this.releaseWeapon(a);
      else {
        this.burst(h.x + h.w / 2 + h.facing * 30, h.y + 15, a.spec.heavy ? '#ffe0a0' : '#baffde', 4, 45);
        if (h.extraProjectiles > 0) this.releaseWeapon({ ...a, weapon: 'ember', spec: { ...a.spec, power: .5, poise: 3 }, charged: false, extraCount: h.extraProjectiles });
      }
    }
  };
  p.updateHero = function (dt, input) {
    const h = this.state.hero;
    if (h.stamina === undefined) this.initSoulsHero();
    for (const key of ['guardCooldown', 'guardBuffer', 'guardBroken', 'staminaDelay', 'attackBuffer', 'dodgeBuffer', 'dodgeStrike', 'parryRiposte', 'hurtLock', 'catchBoost']) h[key] = Math.max(0, h[key] - dt);
    if (input.attackPressed || input.attackHeld) h.attackBuffer = .24;
    if (input.attackPressed && h.weapon === 'disc' && this.state.projectiles.some(shot => shot.kind === 'disc' && shot.owner === 'hero' && shot.life > 0)) h.recallRequested = true;
    if (input.dashPressed) h.dodgeBuffer = .2;
    if (input.guardPressed) h.guardBuffer = .14;
    if (h.queuedWeapon && this.canCancelAction('weapon')) this.equipWeapon(h.queuedWeapon);
    const wantsGuard = (input.guardHeld || h.guardBuffer > 0) && this.canCancelAction('guard');
    if (wantsGuard && h.action) this.cancelAction();
    const wasBlocking = h.blocking;
    h.blocking = !!wantsGuard && h.guardBroken <= 0 && h.dashTimer <= 0 && h.hurtLock <= 0 && h.stamina > 0;
    if (h.blocking && !wasBlocking) { h.guardAge = h.guardCooldown <= 0 ? 0 : 1; h.guardCooldown = .38; }
    else if (h.blocking) h.guardAge += dt;
    if (h.staminaDelay <= 0 && !h.blocking && h.dashTimer <= 0 && (!h.action || h.action.phase === 'recovery')) h.stamina = Math.min(100, h.stamina + 36 * dt);
    if (input.jumpPressed && h.dashTimer > 0 && h.dashTimer <= .10) h.dashTimer = 0;
    const beforeX = h.x, speed = h.speed;
    h.speed *= h.blocking ? .35 : h.action ? h.action.spec.move : 1;
    const movement = h.hurtLock > 0 ? { ...input, left: false, right: false, moveX: 0 } : input;
    base.updateHero.call(this, dt, { ...movement, attackPressed: false, attackHeld: false, dashPressed: h.dodgeBuffer > 0 && h.guardBroken <= 0 });
    h.speed = speed;
    if (h.hp <= 0) { this.cancelAction(); return; }
    this.advanceAction(dt, input);
    if (h.dashTimer > 0) {
      const box = { x: Math.min(beforeX, h.x) - 10, y: h.y - 3, w: Math.abs(h.x - beforeX) + h.w + 20, h: h.h + 6 };
      for (const target of [...this.state.enemies, ...(this.state.boss?.active ? [this.state.boss] : [])]) {
        if (!target.dead && !this.dodgeHits.has(target.id ?? -1) && intersects(box, target)) {
          this.dodgeHits.add(target.id ?? -1);
          this.applyPlayerAttack(target, { id: `dodge-${this.actionSerial}`, damage: h.damage * 1.1, poise: 6, sourceX: beforeX + 14, dir: h.facing, type: 'dodge' });
        }
      }
    }
    this.tryBufferedAttack(input);
  };

  p.damageAmount = function (damage) { this.criticalHit = !!this.criticalContext; return damage * (this.criticalHit ? 1.75 : 1); };
  p.staggerTarget = function (target, duration = .75) {
    target.vx = 0; target.poise = 0;
    if (target === this.state.boss) { target.mode = 'stagger'; target.timer = duration; target.exposed = duration; target.vy = 0; target.y = 448 - target.h; }
    else if (target.ai) { target.ai.phase = 'stagger'; target.ai.age = 0; target.ai.duration = duration; target.ai.hit = true; }
    this.impact(target.x + target.w / 2, target.y + target.h / 2, 'break', '#ffe2a2');
    this.label(target.x + target.w / 2, target.y - 28, '架势击破', '#ffe2a2'); this.sound('guardBreak');
  };
  p.applyPlayerAttack = function (target, attack) {
    if (target.dead || target.mode === 'dead' || target.mode === 'transition') return { result: 'ignored' };
    if (target !== this.state.boss && !target.ai) this.prepareMonster(target);
    const h = this.state.hero, center = target.x + target.w / 2;
    const front = (attack.sourceX - center) * (target.facing || -1) > -4;
    const guarding = target.role === 'shield' && !['active', 'recovery', 'stagger'].includes(target.ai?.phase);
    if (guarding && front && !attack.guardPierce) {
      target.guardFlash = .18;
      target.poise = (target.poise ?? 30) - (attack.poise || 0);
      this.impact(target.x + target.w / 2 + target.facing * 15, target.y + target.h * .5, 'guard', '#c6dfe5'); this.sound('hit');
      if (target.poise > 0) { this.label(center, target.y - 18, '正面格挡 · 绕后 / 重斩', '#c6dfe5'); return { result: 'blocked' }; }
      this.staggerTarget(target, 1.1);
    }
    const backstab = attack.type === 'blade' && !front;
    const marks = target.burnMarks || 0;
    const ignition = attack.type === 'ember' && (attack.charged || marks >= 2);
    const returning = attack.type === 'disc' && attack.returning && attack.outboundHit;
    const critical = backstab || returning || (ignition && marks > 0) || attack.riposte;
    let damage = attack.damage * (ignition && marks > 0 ? 1.35 : 1) * (this.state.synergies.includes('blazing') ? 1.2 : 1);
    this.criticalContext = critical;
    const previousHp = target.hp;
    if (target === this.state.boss) this.hitBoss(damage, !!attack.heavy);
    else this.hitEnemy(target, damage, !!attack.heavy);
    this.criticalContext = false;
    if (target.hp >= previousHp) return { result: 'ignored' };
    target.vx = (attack.dir || h.facing) * (attack.heavy ? 140 : 55);
    if (!target.dead && target !== this.state.boss) {
      target.poise = (target.poise ?? target.poiseMax ?? 20) - (attack.poise || 0);
      target.poiseDelay = 1.2;
      if (target.poise <= 0 && target.ai?.phase !== 'stagger') this.staggerTarget(target, target.elite ? .85 : .65);
    }
    if (backstab) this.label(center, target.y - 30, '背击', '#ffe3a3');
    if (returning) this.label(center, target.y - 30, '回轮追猎', '#d4bcff');
    if (attack.type === 'ember') {
      target.burnMarks = ignition ? 0 : Math.min(3, marks + 1); target.markLife = this.state.hero.upgrades.includes('cinder')?5.5:3.5;
      if (ignition) {
        this.label(center, target.y - 30, '灼印引爆', '#ffc58b');
        this.explodeAt(center, target.y + target.h / 2, attack.damage * .65, target, attack.charged ? 86 : 68);
      }
    }
    return { result: critical ? 'critical' : 'hit' };
  };
  p.explodeAt = function (x, y, damage, excluded, radius) {
    this.impact(x, y, 'explosion', '#ffbf7c'); this.burst(x, y, '#ffb46e', 16, 150); this.sound('heavy');
    for (const other of this.state.enemies) if (!other.dead && other !== excluded && Math.hypot(other.x + other.w / 2 - x, other.y + other.h / 2 - y) < radius) this.applyPlayerAttack(other, { damage, sourceX: x, dir: Math.sign(other.x - x), type: 'explosion', poise: 20, heavy: true, guardPierce: true });
  };
  p.hitEnemy = function (enemy, damage, heavy = false) {
    const alive = !enemy.dead;
    base.hitEnemy.call(this, enemy, damage, heavy);
    if (alive && enemy.dead) {
      if (enemy.ai) { enemy.ai.phase = 'dead'; enemy.ai.hit = true; }
      for (const shot of this.state.projectiles) if (shot.owner !== 'hero' && shot.source === enemy) shot.life = 0;
      if (enemy.elite) { this.drop('heart', enemy.x, enemy.y - 18, 1); if (this.state.trial) this.state.trial.eliteDefeated = true; }
    }
  };
  p.receiveAttack = function (attack) {
    const s = this.state, h = s.hero;
    if (s.phase !== 'playing' || h.hp <= 0) return { result: 'ignored' };
    if (h.invincible > 0 && !attack.forced) {
      if (h.dashTimer > .08 && h.perfectDodgeCooldown <= 0 && !attack.environmental) {
        h.counterTimer = 1.1; h.perfectDodgeCooldown = .8; this.gainResonance(15);
        this.label(h.x + 14, h.y - 25, '精准闪避', '#b5ffdf'); this.sound('perfectDodge');
      }
      return { result: 'evaded' };
    }
    const front = (attack.sourceX - h.x - h.w / 2) * h.facing >= -4;
    if (!attack.environmental && h.blocking && front && attack.canBlock !== false) {
      if (h.guardAge <= .16 && attack.canParry !== false) {
        h.parryRiposte = h.counterTimer = 1.5; h.stamina = Math.min(100, h.stamina + 16); h.invincible = .16;
        this.gainResonance(20); const source = attack.source;
        if (source && !source.dead && source.mode !== 'dead' && source.mode !== 'transition') {
          if (source === s.boss) {
            source.guard = Math.max(0, source.guard - 14);
            if (source.guard <= 0) this.staggerTarget(source, 1);
            else { source.mode = 'recover'; source.timer = .4; source.exposed = .65; source.vx = 0; }
          } else {
            if (!source.ai) this.prepareMonster(source);
            source.poise = (source.poise ?? 20) - 22;
            if (source.poise <= 0) this.staggerTarget(source, .9);
            else if (source.ai) { source.ai.phase = 'recovery'; source.ai.age = 0; source.ai.duration = .4; source.ai.hit = true; }
          }
        }
        s.hitstop = .065; s.shake = 4;
        this.impact(h.x + 14 + h.facing * 22, h.y + 16, 'parry', '#ffe3a3');
        this.label(h.x + 14, h.y - 28, '精准格挡 · 反击', '#ffe3a3'); this.sound('perfectDodge');
        return { result: 'parried' };
      }
      if (this.spendStamina(28 * attack.damage)) {
        h.invincible = .16; this.impact(h.x + h.facing * 25, h.y + 12, 'guard', '#c2e3ea'); this.sound('hit'); return { result: 'blocked' };
      }
      h.stamina = 0; h.guardBroken = .7; h.blocking = false;
      this.label(h.x, h.y - 26, '架势崩溃', '#ffad91');
    }
    const hp = h.hp;
    base.hurtHero.call(this, attack.damage, attack.sourceX, !!attack.forced);
    if (h.hp < hp) { this.cancelAction(); h.attackBuffer = 0; h.hurtLock = .2; }
    return { result: h.hp < hp ? 'hurt' : 'absorbed' };
  };
  p.hurtHero = function (damage, sourceX, forced = false, environmental = forced) {
    return this.receiveAttack({ damage, sourceX, forced, environmental, canBlock: !environmental, canParry: !environmental });
  };

  p.releaseWeapon = function (action) {
    const h = this.state.hero, kind = action.weapon;
    const muzzle=weaponMuzzle(h,kind,action.facing);
    const damage = h.damage * action.spec.power * action.power * (this.state.overdrive > 0 ? 1.5 : 1);
    const shot = { id: ++this.projectileId, kind, x: muzzle.x-7, y:muzzle.y, w: kind === 'disc' ? 22 : action.charged ? 20 : 13, h: kind === 'disc' ? 22 : action.charged ? 18 : 12, vx: action.facing * (kind === 'disc' ? 600 : 740), vy: 0, life: kind === 'disc' ? 2.1 : 1.2, age: 0, damage: damage * (action.charged ? 2.3 : 1), owner: 'hero', hitIds: [], outboundHits: [], returning: false, rotation: 0, charged: action.charged, poise: action.charged ? 24 : action.spec.poise, riposte: action.power >= 1.65, source: h, facing: action.facing };
    if (kind === 'ember' || kind === 'disc') {
      const target = this.state.enemies.filter(e => !e.dead && (e.x - h.x) * action.facing > 0 && Math.abs(e.x - h.x) < 500 && Math.abs(e.y + e.h / 2 - h.y - 16) < 75).sort((a, b) => Math.abs(a.x - h.x) - Math.abs(b.x - h.x))[0];
      if (target) shot.vy = Math.max(-180, Math.min(180, (target.y + target.h / 2 - shot.y - shot.h / 2) / Math.max(60, Math.abs(target.x - shot.x)) * Math.abs(shot.vx)));
    }
    const capacity = 1 + Math.min(2, h.extraProjectiles + Number(this.state.synergies.includes('fireflies')));
    const available = kind === 'disc' ? capacity - this.state.projectiles.filter(p => p.owner === 'hero' && p.kind === 'disc' && p.life > 0).length : capacity;
    const count = Math.min(available, action.extraCount || capacity);
    for (let j = 0; j < count; j++) {
      const copy = { ...shot, id: j === 0 ? shot.id : ++this.projectileId, hitIds: [], outboundHits: [], vy: shot.vy + (j - (count - 1) / 2) * 70 };
      this.state.projectiles.push(copy);
    }
    this.burst(shot.x, shot.y, kind === 'ember' ? '#ffc28c' : '#c4b4ff', 8, 90);
  };
  p.returnDisc = function (shot) { if (!shot.returning) { shot.returning = true; shot.hitIds = []; } };
  p.updateAttacks = function (dt) {
    const s = this.state, h = s.hero, action = h.action;
    if (action?.phase === 'active' && action.weapon === 'blade') {
      const box = attackBox(h, action.spec.reach, action.spec.height, action.facing);
      for (const target of [...s.enemies, ...(s.boss?.active ? [s.boss] : [])]) {
        const id = target.id ?? -1;
        if (!target.dead && !action.hitTargets.has(id) && intersects(box, target)) {
          action.hitTargets.add(id);
          this.applyPlayerAttack(target, { id: action.id, damage: h.damage * action.spec.power * action.power * (s.overdrive > 0 ? 1.5 : 1), poise: action.spec.poise, sourceX: h.x + h.w / 2, dir: action.facing, type: 'blade', heavy: action.spec.heavy, riposte: action.power >= 1.65 });
        }
      }
    }
    for (const shot of s.projectiles) {
      if (shot.life <= 0) continue;
      shot.life -= dt; shot.age = (shot.age || 0) + dt; shot.rotation = (shot.rotation || 0) + dt * 17;
      if (shot.kind === 'disc') {
        if (shot.age > .42 || shot.x < 20 || shot.x > s.room.width - 30) this.returnDisc(shot);
        if (shot.returning) {
          const dx = h.x + h.w / 2 - shot.x, dy = h.y + h.h / 2 - shot.y, distance = Math.hypot(dx, dy) || 1;
          if (distance < 24) { shot.life = 0; h.stamina = Math.min(100, h.stamina + 8); h.catchBoost = 1.2; this.burst(h.x + 14, h.y + 15, '#c8b7ff', 7, 65); continue; }
          shot.vx = dx / distance * 720; shot.vy = dy / distance * 720;
        }
      }
      shot.x += shot.vx * dt; shot.y += shot.vy * dt;
      if (shot.x < -80 || shot.x > s.room.width + 80 || shot.y > 600 || shot.y < -100) { shot.life = 0; continue; }
      if (shot.owner === 'hero') {
        for (const target of [...s.enemies, ...(s.boss?.active ? [s.boss] : [])]) {
          const id = target.id ?? -1;
          if (target.dead || shot.hitIds.includes(id) || !intersects(shot, target)) continue;
          shot.hitIds.push(id);
          const result = this.applyPlayerAttack(target, { id:`shot-${shot.id}-${Number(!!shot.returning)}`, damage: shot.damage * (shot.returning ? 1.35 : 1), poise: shot.poise || 8, sourceX: shot.x - Math.sign(shot.vx) * 20, dir: Math.sign(shot.vx), type: shot.kind, charged: shot.charged, returning: shot.returning, outboundHit: shot.outboundHits?.includes(id), heavy: shot.charged, guardPierce: shot.charged, riposte: shot.riposte });
          if (shot.kind === 'disc') { if (!shot.returning && ['hit', 'critical'].includes(result.result)) shot.outboundHits.push(id); }
          else { shot.life = 0; break; }
        }
      } else if (intersects(shot, h) && !shot.hitIds.includes('hero')) {
        shot.hitIds.push('hero');
        const result = this.receiveAttack({ damage: shot.damage, source: shot.source || (s.boss?.active ? s.boss : null), sourceX: h.x + h.w / 2 - Math.sign(shot.vx) * 30, canBlock: shot.kind !== 'shockwave', canParry: shot.kind !== 'shockwave', type: shot.kind });
        if (result.result === 'parried' && shot.kind !== 'shockwave') { shot.owner = 'hero'; shot.vx *= -1; shot.vy *= -1; shot.damage *= 2; shot.hitIds = []; shot.life = 1.5; shot.poise = 22; }
        else shot.life = 0;
      }
      if (shot.kind !== 'disc' && s.room.platforms.some(tile => !tile.oneWay && intersects(shot, tile))) {
        if (shot.owner === 'hero') this.burst(shot.x, shot.y, '#ffbe8a', 4, 60);
        shot.life = 0;
      }
    }
    s.projectiles = s.projectiles.filter(shot => shot.life > 0);
  };
  p.enemyContact = function () {
    const b = this.state.boss;
    if (b?.active && b.mode === 'charge' && intersects(b, this.state.hero)) this.receiveAttack({ source: b, sourceX: b.x + b.w / 2, damage: 1, canBlock: true, canParry: true });
  };
  p.offerUpgrade = function () { base.offerUpgrade.call(this); const h = this.state.hero; h.hp = Math.min(h.maxHp, h.hp + 1); h.stamina = 100; this.cancelAction(); this.label(h.x, h.y - 20, '升级恢复 +1 ♥', '#ffb5bd'); };
  p.chooseUpgrade = function (id) { base.chooseUpgrade.call(this, id); this.state.hero.action = null; };
  p.step = function (dt, input) {
    base.step.call(this, dt, input);
    const s = this.state, h = s.hero, trial = s.trial;
    if (!trial || s.campaign || s.phase !== 'playing') return;
    const chest = trial.chest, near = Math.hypot(h.x + 14 - chest.x - 17, h.y + 18 - chest.y - 15) < 70;
    const guardAlive = s.enemies.some(e => e.optional && e.guardGroup!=='relic' && !e.dead);
    trial.hint = near && !chest.opened ? guardAlive ? '击败高台守卫，开启藏珍' : '按互动键开启宝匣：武器强化 + 回血' : '';
    if (near && !guardAlive && !chest.opened && input.interactPressed) {
      chest.opened = true; trial.reward = true; h.damage *= 1.35; h.hp = Math.min(h.maxHp, h.hp + 1); h.shield += 1; s.coins += 12;
      this.label(chest.x, chest.y - 25, '藏珍：全武器 +35% · 护盾 +1', '#ffe3a3');
      this.burst(chest.x + 17, chest.y, '#ffe0a0', 24, 160); this.sound('upgrade');
      s.announcement = '支路藏珍已获得 · 全武器强化'; s.announcementTimer = 2.6;
    }
  };
  installMonsterAI(Engine);
  installForestRuntime(Engine);
  installCombatVfx(Engine);
  installHeroAnimation(Engine);
  installRunSystems(Engine,upgradePool);
  installCampaignRuntime(Engine,upgradePool);
}
